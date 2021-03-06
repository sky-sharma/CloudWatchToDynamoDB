exports.handler = (event, context, callback) =>
{
const fs = require('fs');
const path = require('path');
const utils = require('./utils.js');
const aws = require('aws-sdk');
const zlib = require('zlib'); // Package to decode base64 encoding of "event" argument of exports.handler.

//globally
aws.config.paramValidation = false;

// var s3 = new aws.S3();
var dynamodb = new aws.DynamoDB({ region: 'us-west-2', apiVersion: '2012-08-10' });
var docClient = new aws.DynamoDB.DocumentClient({ service: dynamodb });

//aws.config.update({ endpoint: 'https://s3.us-west-2.amazonaws.com' });

// var params = {
//   Bucket: 'connection-logs' /* required */};

  var searchStrings =
  {
    Connection: 'EVENT:MQTT Client Connect MESSAGE: IpAddress:',
    Disconnection: 'EVENT:MQTT Client Disconnect MESSAGE: IpAddress:',
    PublishInTopic: 'EVENT:PublishEvent TOPICNAME:',
    PublishOutTopic: 'EVENT:PublishOut TOPICNAME:',
    SubscribeTopic: 'EVENT:MQTTClient Subscribe TOPICNAME:',
    PublishInIp: 'EVENT:PublishEvent MESSAGE: IpAddress:',
    PublishOutIp: 'EVENT:PublishOut MESSAGE: IpAddress:',
    SubscribeIp: 'EVENT:MQTTClient Subscribe MESSAGE: IpAddress:'
  };

var connInfoSearchPatterns = ['%s %s', 'PRINCIPALID:%s', 'IpAddress: %s ', 'SourcePort: %s'];
var topicSearchPattern = 'TOPICNAME:%s ';
var principalIdPattern = 'PRINCIPALID:%s';

// var infoThisFile = []; // Clear array of Connections collected from last file
// var logFiles = [];
// var logFileNum = 0;
var PrincipalID; // dBase Key field
var PubInTopicInfo = '';
var PubOutTopicInfo = '';
var SubscribeTopicInfo = '';
var IpAddress = '';

// Next few lines to decode base64 encoding of "event" argument of exports.handler
var payload = new Buffer(event.awslogs.data, 'base64');
zlib.gunzip(payload, (err, result) => {
  if (err) console.log(err);
  else
  {
    eventResult = JSON.parse(result.toString('ascii'));
    eventResult.logEvents.forEach((logEvent) =>
    {
      eventStr = logEvent.message; // message is the part of the event JSON object that we want to parse
      // console.log('eventStr: ', eventStr);
      eventInfo = utils.parseEvent(eventStr, searchStrings, connInfoSearchPatterns, topicSearchPattern, principalIdPattern);
      // console.log('eventInfo: ', eventInfo);
      getAndPutConnection(eventInfo);
    });
  }
})

// s3.listObjects(params, function(err, data)
// {
//   if (err) console.log(err, err.stack); //an error occurred
//   else
//   {
//     logFiles = data.Contents;
//     // console.log(logFiles);
//     readS3AndGetPutConnection(logFiles, logFileNum++);
// }});

// function readS3AndGetPutConnection(logFiles, logFileIndex)
// {
//   // Recursive function to read s3 item, then put connections in dBase
//   // This involves reading existing numbers of connections / disconnections
//   // from the dBase and adding to the tallies.
//
//   if (logFileIndex >= logFiles.length) return; // All done
//
//   console.log('logFileIndex: ', logFileIndex);
//   // console.log('logFiles: ', logFiles);
//
//   var logFileName = logFiles[logFileIndex].Key;
//   // console.log('logFile: ', logFileName);
//
//   params.Key = logFileName;
//   // console.log(params);
//   // Get Log File Name
//
//   s3.getObject((params), (err, fileContents) =>
//   {
//     // Read contents of fileContents
//     if (err) throw err;
//     var logContents = fileContents.Body;
//
//     infoThisFile = utils.parseLog(logContents, searchStrings, connInfoSearchPatterns, topicSearchPattern);
//     getAndPutConnection(infoThisFile);
//   });
// }

// Put IpAddresses of Connections in Connections table.
function getAndPutConnection(eventInfo)
{
  // Recursive function to make sure dBase read and write happen sequentially.
  // We read a record from the dBase, get the Number of Connections and Number of Disconnections
  // from the record and add to those.

  var dBasePutParams =
  {
    TableName: 'Indie_Connections'
  }

  var dBaseGetParams =
  {
    TableName: 'Indie_Connections'
  }

  // if (recordNum >= infoForDbase.length)
  // {
  //   readS3AndGetPutConnection(logFiles, logFileNum++);
  //   return; // All done.
  // }

  var recordContents = eventInfo.Contents;
  console.log('recordContents: ', recordContents);
  if (recordContents === 'ConnInfo')
  {
    PrincipalID = eventInfo.ConnInfo[1];

    console.log('IpAddress: ', eventInfo.ConnInfo[2]);
    IpAddress = eventInfo.ConnInfo[2];
    var Status = eventInfo.ConnInfo[4];
    var LastConnDisconn = eventInfo.ConnInfo[0][0] + ' ' + eventInfo.ConnInfo[0][1];

    dBaseGetParams.Key = { 'PrincipalID': PrincipalID };

    dBasePutParams.Item =
    {
      'PrincipalID': PrincipalID,
      'LastIpAddress': IpAddress,
      'CurrentStatus': Status, //Connected or Disconnected
      'LastConnDisconnTime': LastConnDisconn // Concatenating Date and Time
      // 'TotalNumConnections': 0, // Placeholder
      // 'TotalNumDisconnections': 0, // Placeholder
      // 'PubInTopic': ' ', // Placeholder
      // 'PubInTopicNumMsgs': 0, // Placeholder
      // 'PubOutTopic': ' ', // Placeholder
      // 'PubOutTopicNumMsgs': 0 // Placeholder
    }
  }

 if ((recordContents === 'PubIp') || (recordContents === 'SubscribeIp'))
 {
   PrincipalID = eventInfo.ConnInfo[1];

   console.log('IpAddress: ', eventInfo.ConnInfo[2]);
   IpAddress = eventInfo.ConnInfo[2];
   // var Status = eventInfo.ConnInfo[5];
   // var LastConnDisconn = eventInfo.ConnInfo[0][0] + ' ' + eventInfo.ConnInfo[0][1];

   dBaseGetParams.Key = { 'PrincipalID': PrincipalID };

   dBasePutParams.Item =
   {
     'PrincipalID': PrincipalID,
     'LastIpAddress': IpAddress
    //  'CurrentStatus': Status, //Connected or Disconnected
    //  'LastConnDisconnTime': LastConnDisconn // Concatenating Date and Time
    //  'TotalNumConnections': 0, // Placeholder
     // 'TotalNumDisconnections': 0, // Placeholder
     // 'PubInTopic': ' ', // Placeholder
     // 'PubInTopicNumMsgs': 0, // Placeholder
     // 'PubOutTopic': ' ', // Placeholder
     // 'PubOutTopicNumMsgs': 0 // Placeholder
   }
 }

  if (recordContents === 'SubscribeTopic')
  {
    var SubscribeTopicInfo = eventInfo.TopicName;
    PrincipalID = eventInfo.PrincipalID;
    // IpAddress = eventInfo.TopicSubscriber[2];
    // Normally, if a topic is being written, then we
    // should consider the device to be Connected.
    // However in this case we are ONLY considering
    // a device conneted when the following is received:
    // "Connect Status: SUCCESS"
    // Status = eventInfo.TopicSubscriber[4];
    // LastConnDisconn = currentRecord.TopicSubscriber[0][0] + ' ' + currentRecord.TopicSubscriber[0][1];

    dBaseGetParams.Key = { 'PrincipalID': PrincipalID };

    dBasePutParams.Item =
    {
      'PrincipalID': PrincipalID
      // 'LastIpAddress': IpAddress,
      // 'CurrentStatus': Status //Connected or Disconnected
      // 'LastConnDisconnTime': LastConnDisconn // Concatenating Date and Time
    }
  }

  if (recordContents === 'PubInTopic')
  {
    var PubInTopicInfo = eventInfo.TopicName;
    PrincipalID = eventInfo.PrincipalID;
    // IpAddress = eventInfo.TopicSubscriber[2];
    // Normally, if a topic is being written, then we
    // should consider the device to be Connected.
    // However in this case we are ONLY considering
    // a device conneted when the following is received:
    // "Connect Status: SUCCESS"
    // Status = eventInfo.TopicSubscriber[4];
    // LastConnDisconn = currentRecord.TopicSubscriber[0][0] + ' ' + currentRecord.TopicSubscriber[0][1];
    //PubInTopicInfo = `${PubInTopicName}`; // Use Template string to create field name rather than field value.

    dBaseGetParams.Key = { 'PrincipalID': PrincipalID };

    dBasePutParams.Item =
    {
      'PrincipalID': PrincipalID
      // 'LastIpAddress': IpAddress,
      // 'CurrentStatus': Status //Connected or Disconnected
      // 'LastConnDisconnTime': LastConnDisconn // Concatenating Date and Time
    }
  }

  if (recordContents === 'PubOutTopic')
  {
    var PubOutTopicInfo = eventInfo.TopicName;
    PrincipalID = eventInfo.PrincipalID;
    // IpAddress = eventInfo.TopicSubscriber[2];
    // Normally, if a topic is being written, then we
    // should consider the device to be Connected.
    // However in this case we are ONLY considering
    // a device conneted when the following is received:
    // "Connect Status: SUCCESS"
    // Status = eventInfo.TopicSubscriber[4];
    // LastConnDisconn = currentRecord.TopicSubscriber[0][0] + ' ' + currentRecord.TopicSubscriber[0][1];
    //PubOutTopicInfo = `${PubOutTopicName}`; // Use Template string to create field name rather than field value.

    dBaseGetParams.Key = { 'PrincipalID': PrincipalID };

    dBasePutParams.Item =
    {
      'PrincipalID': PrincipalID
      // 'LastIpAddress': IpAddress,
      // 'CurrentStatus': Status //Connected or Disconnected
      // 'LastConnDisconnTime': LastConnDisconn // Concatenating Date and Time
    }
  }

/*
  if (recordContents === 'PubIp')
  {
    PrincipalID = eventInfo.ConnInfo[2];
    (eventInfo.ConnInfo[3]) ? (IpAddress = eventInfo.ConnInfo[3]) : (IpAddress = '');
    console.log('IpAddress: ', eventInfo.ConnInfo[3]);
    var Status = eventInfo.ConnInfo[5];
    var LastConnDisconn = eventInfo.ConnInfo[0][0] + ' ' + eventInfo.ConnInfo[0][1];

    dBaseGetParams.Key = { 'PrincipalID': PrincipalID };

    dBasePutParams.Item =
    {
      'PrincipalID': PrincipalID,
      'LastIpAddress': IpAddress,
      'CurrentStatus': Status, //Connected or Disconnected
      'LastConnDisconnTime': LastConnDisconn // Concatenating Date and Time
      // 'TotalNumConnections': 0, // Placeholder
      // 'TotalNumDisconnections': 0, // Placeholder
      // 'PubInTopic': ' ', // Placeholder
      // 'PubInTopicNumMsgs': 0, // Placeholder
      // 'PubOutTopic': ' ', // Placeholder
      // 'PubOutTopicNumMsgs': 0 // Placeholder
    }
  }

  if (recordContents === 'SubscribeIp')
  {
    PrincipalID = eventInfo.ConnInfo[2];
    (eventInfo.ConnInfo[3]) ? (IpAddress = eventInfo.ConnInfo[3]) : (IpAddress = '');
    console.log('IpAddress: ', eventInfo.ConnInfo[3]);
    var Status = eventInfo.ConnInfo[5];
    var LastConnDisconn = eventInfo.ConnInfo[0][0] + ' ' + eventInfo.ConnInfo[0][1];

    dBaseGetParams.Key = { 'PrincipalID': PrincipalID };

    dBasePutParams.Item =
    {
      'PrincipalID': PrincipalID,
      'LastIpAddress': IpAddress,
      'CurrentStatus': Status, //Connected or Disconnected
      'LastConnDisconnTime': LastConnDisconn // Concatenating Date and Time
      // 'TotalNumConnections': 0, // Placeholder
      // 'TotalNumDisconnections': 0, // Placeholder
      // 'PubInTopic': ' ', // Placeholder
      // 'PubInTopicNumMsgs': 0, // Placeholder
      // 'PubOutTopic': ' ', // Placeholder
      // 'PubOutTopicNumMsgs': 0 // Placeholder
    }
  }
*/

  docClient.get(dBaseGetParams, (err, readRecord) =>
  {
    if (err) console.log(err);
    else if ((Object.keys(readRecord).length === 0) && (readRecord.constructor === Object))
    // The particular record is not found in the dBase, so enter it
    {
      // If Status is Connected then set TotalNumConnections to 1 since this is first record
      // If Status is Disonnected then set TotalNumDisconnections to 1 since this is first record

      if (recordContents === 'ConnInfo')
      {
//        dBasePutParams.Item.PubInTopicNumMsgs = 0;
//        dBasePutParams.Item.PubOutTopicNumMsgs = 0;

        if (Status === 'Connected')
        {
          dBasePutParams.Item.TotalNumConnections = 1;
          dBasePutParams.Item.TotalNumDisconnections = 0;
        }
        else if (Status === 'Disconnected')
        {
          dBasePutParams.Item.TotalNumConnections = 0;
          dBasePutParams.Item.TotalNumDisconnections = 1;
        }
      }

      if (recordContents === 'SubscribeTopic')
      {
        // Even though it makes sense that a connection must exist for topics to be written / read
        // we are strictly updating TotalNumConnections only when explicitly receiving "Status Connect: SUCCESS".
        // This will simplify things when we read from CloudWatch

        dBasePutParams.Item[SubscribeTopicInfo] = { 'Status': 'Subscribed' };
      }

      if (recordContents === 'PubInTopic')
      {
        // Even though it makes sense that a connection must exist for topics to be written / read
        // we are strictly updating TotalNumConnections only when explicitly receiving "Status Connect: SUCCESS".
        // This will simplify things when we read from CloudWatch

          dBasePutParams.Item[PubInTopicInfo] = { '#PubInMsgs': 1 };
      }

      if (recordContents === 'PubOutTopic')
      {
        // Even though it makes sense that a connection must exist for topics to be written / read
        // we are strictly updating TotalNumConnections only when explicitly receiving "Status Connect: SUCCESS".
        // This will simplify things when we read from CloudWatch

          dBasePutParams.Item[PubOutTopicInfo] = { '#PubOutMsgs': 1 };
      }

      docClient.put(dBasePutParams, (err, data) =>
      {
        // console.log('Entering for first time: ', dBasePutParams);
        if (err) console.error('Unable to add new item. Error JSON:', JSON.stringify(err, null, 2));
        else
        {
          // getAndPutConnection(infoForDbase, recordNum + 1); // This function calls itself recursively
          return;
        }
      });
    }

    else
    {
      // First read TotalNumConnections and TotalNumDisconnections.
      // The appropriate ones will be incremented as needed.
      // If those fields are not present set them to 0.

      readRecord.Item.TotalNumConnections ? (dBasePutParams.Item.TotalNumConnections =
        readRecord.Item.TotalNumConnections) : (dBasePutParams.Item.TotalNumConnections = 0);
      readRecord.Item.TotalNumDisconnections ? (dBasePutParams.Item.TotalNumDisconnections =
        readRecord.Item.TotalNumDisconnections) : (dBasePutParams.Item.TotalNumDisconnections = 0);

      // If no Status info. in recently parsed record, use the last Status from dBase.
      if (dBasePutParams.Item.CurrentStatus === undefined) dBasePutParams.Item.CurrentStatus = readRecord.Item.CurrentStatus;

      // If Status is Connected then take TotalNumConnections for this PrincipalID in dBase and increment
      // If Status is Disonnected then take TotalNumDisconnections for this PrincipalID in dBase and decrement.
      if (recordContents === 'ConnInfo')
      {
        if (Status === 'Connected')
        {
          (dBasePutParams.Item.TotalNumConnections)++;
        }
        else
        {
          (dBasePutParams.Item.TotalNumDisconnections)++;
        }
      }

      else if (recordContents === 'SubscribeTopic')
      {
        readRecord.Item[SubscribeTopicInfo] ?
        (dBasePutParams.Item[SubscribeTopicInfo] = readRecord.Item[SubscribeTopicInfo]) :
        (dBasePutParams.Item[SubscribeTopicInfo] = { 'Status': 'Subscribed' });

          dBasePutParams.Item[SubscribeTopicInfo].Status = 'Subscribed';
      }

      else if (recordContents === 'PubInTopic')
      {
        readRecord.Item[PubInTopicInfo] ?
        (dBasePutParams.Item[PubInTopicInfo] = readRecord.Item[PubInTopicInfo]) :
        (dBasePutParams.Item[PubInTopicInfo] = { '#PubInMsgs': 0 });

        if ((dBasePutParams.Item[PubInTopicInfo]['#PubInMsgs'] === NaN) || (dBasePutParams.Item[PubInTopicInfo]['#PubInMsgs'] === undefined))
        dBasePutParams.Item[PubInTopicInfo]['#PubInMsgs'] = 0;
        (dBasePutParams.Item[PubInTopicInfo]['#PubInMsgs'])++;
      }

      else if (recordContents === 'PubOutTopic')
      {
        readRecord.Item[PubOutTopicInfo] ?
        (dBasePutParams.Item[PubOutTopicInfo] = readRecord.Item[PubOutTopicInfo]) :
        (dBasePutParams.Item[PubOutTopicInfo] = { '#PubOutMsgs': 0 });

        if ((dBasePutParams.Item[PubOutTopicInfo]['#PubOutMsgs'] === NaN) || (dBasePutParams.Item[PubOutTopicInfo]['#PubOutMsgs'] === undefined))
        dBasePutParams.Item[PubOutTopicInfo]['#PubOutMsgs'] = 0;
        (dBasePutParams.Item[PubOutTopicInfo]['#PubOutMsgs'])++;
      }

      else if ((recordContents === 'PubIp') || (recordContents === 'SubscribeIp'))
      {
        dBasePutParams.Item.LastIpAddress = IpAddress;
      }

      // Missing fields from readRecord are the ones added using dBasePutParams
      var newRecord = {};
      newRecord.Item = Object.assign({}, readRecord.Item, dBasePutParams.Item);
      newRecord.TableName = dBasePutParams.TableName;

      docClient.put((newRecord), (err, data) =>
      {
        // console.log('Adding to existing: ', dBasePutParams);
        if (err) console.error('Unable to add to existing item. Error JSON:', JSON.stringify(err, null, 2));

        else
        {
          // getAndPutConnection(infoForDbase, recordNum + 1); // This function calls itself recursively
          return;
        }
      });
    }
  });
}
callback(null, 'Lambda Completed');
}
