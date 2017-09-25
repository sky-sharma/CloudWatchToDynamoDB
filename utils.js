const scanf = require('scanf')
const sscanf = require('scanf').sscanf;
// var rawDataRows = [];
var connectionInfo = []; //1D array of connection parameters
var connectionInfoPlusStatus = []; //1D array of connection info. along with String indicating connection status
var infoFromEventStr = {}; //Object of connection info.

module.exports.parseEvent = (eventStr, searchStrings, connInfoSearchPatterns, topicSearchPattern) =>
{
  // Receives a string from a Monitor Log file,looks for searchString,
  // and returns the items defined by searchPatterns.

  var numConnections = 0;
  var numDisconnections = 0;

  connectionInfo = [];
  connectionInfoPlusStatus = [];

  // Check if eventStr contains either Connection or Disconnection searchString
  if(eventStr.indexOf(searchStrings.Connection) > -1)
    {
      connectionInfoPlusStatus = parseConnectionInfo(eventStr, connInfoSearchPatterns);
      connectionInfoPlusStatus.push('Connected');
      // connectionInfoPlusStatus.push(++numConnections);
      // connectionInfoPlusStatus.push(numDisconnections);
      infoFromEventStr = {Contents: 'ConnInfo', ConnInfo: connectionInfoPlusStatus};
    }
    else if(eventStr.indexOf(searchStrings.Disconnection) > -1)
    {
      connectionInfoPlusStatus = parseConnectionInfo(eventStr, connInfoSearchPatterns);
      connectionInfoPlusStatus.push('Disconnected');
      // connectionInfoPlusStatus.push(numConnections);
      // connectionInfoPlusStatus.push(++numDisconnections);
      infoFromEventStr = {Contents: 'ConnInfo', ConnInfo: connectionInfoPlusStatus};
    }
    else if(eventStr.indexOf(searchStrings.PublishInTopic) > -1)
    {
      infoFromEventStr =
        {
          Contents: 'PubInTopic',
          TopicName: sscanf(eventStr, topicSearchPattern),
          TopicSubscriber: parseConnectionInfo(eventStr, connInfoSearchPatterns)
        };
    }
    else if(eventStr.indexOf(searchStrings.SubscribeTopic) > -1)
    {
      infoFromEventStr =
        {
          Contents: 'SubscribeTopic',
          TopicName: sscanf(eventStr, topicSearchPattern),
          TopicSubscriber: parseConnectionInfo(eventStr, connInfoSearchPatterns)
        };
    }
    else if(eventStr.indexOf(searchStrings.PublishOutTopic) > -1)
    {
      infoFromEventStr = {
        Contents: 'PubOutTopic',
        TopicName: sscanf(eventStr, topicSearchPattern),
        TopicSubscriber: parseConnectionInfo(eventStr, connInfoSearchPatterns)
      };
    }
    else if(eventStr.indexOf(searchStrings.PublishInIp) > -1)
    {
      connectionInfo = parseConnectionInfo(eventStr, connInfoSearchPatterns);
      // connectionInfoPlusStatus.push('Disconnected');
      // connectionInfoPlusStatus.push(numConnections);
      // connectionInfoPlusStatus.push(++numDisconnections);
      infoFromEventStr = { Contents: 'PubIp', ConnInfo: connectionInfo };
    }
    else if(eventStr.indexOf(searchStrings.PublishOutIp) > -1)
    {
      connectionInfo = parseConnectionInfo(eventStr, connInfoSearchPatterns);
      // connectionInfoPlusStatus.push('Disconnected');
      // connectionInfoPlusStatus.push(numConnections);
      // connectionInfoPlusStatus.push(++numDisconnections);
      infoFromEventStr = { Contents: 'PubIp', ConnInfo: connectionInfo };
    }
    else if(eventStr.indexOf(searchStrings.SubscribeIp) > -1)
    {
      connectionInfo = parseConnectionInfo(eventStr, connInfoSearchPatterns);
      // connectionInfoPlusStatus.push('Disconnected');
      // connectionInfoPlusStatus.push(numConnections);
      // connectionInfoPlusStatus.push(++numDisconnections);
      infoFromEventStr = { Contents: 'SubscribeIp', ConnInfo: connectionInfo };
    }

  return infoFromEventStr;
};

function parseConnectionInfo(eventStr, connInfoSearchPatterns)
{
  var connectionInfo = [];
  connInfoSearchPatterns.forEach((connInfoSearchPattern) =>
  {
    // Parse out parameter values found after searchPattern
    // and create row of those values.

    connectionInfo.push(sscanf(eventStr, connInfoSearchPattern));
    // The first row contains the connection or
    // disconnection status. The second row contains the TraceID and other info.
  });

  return connectionInfo;
}
