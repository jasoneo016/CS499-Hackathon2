var request = require('request');
var AWS = require('aws-sdk');

AWS.config.update({
  region: "us-west-1"
});

'use strict';


module.exports.hello = (event, context, callback) => {
  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      message: 'Bus info updated!'
    }),
  };

  resetInfo();
  getBusInfo();
  callback(null, response);  
}

module.exports.query = (event, context, callback) => {  
  queryBusInfo(event.pathParameters.name, callback);
};

var docClient = new AWS.DynamoDB.DocumentClient();
var table = "BroncoExpressDB";

function getBusInfo() {
  request('https://rqato4w151.execute-api.us-west-1.amazonaws.com/dev/info', function (error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log(body);
          var items = JSON.parse(body);
          for(var i = 0; i < items.length; i++) {
            console.log(items[i].busID, items[i].logo, items[i].lat, items[i].longi, items[i].route);
            putItem(items[i].busID.toString(), items[i].logo, items[i].lat, items[i].lng, items[i].route);
          }
        }
    })
}


function putItems(busID, logo, lat, longi, route) {
  var params = {
    TableName:table,
    Item:{
      "busID": busID,
      "timestamp": Date.now(),
      "logo": logo,
      "lat": lat,
      "longi": longi,
      "route": route
    }
  };

  console.log("Adding a new item...");
  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
    }
  });       
}

function resetInfo() {
    var params = {
        TableName : table
    };

    docClient.scan(params, function(err, data) {
        if (err) {
            console.error("Unable to scan. Error:", JSON.stringify(err, null, 2));
        } else {
            data.Items.forEach(function(item) {
                var param = {
                    TableName: table,
                    Key: {
                        "busID":item.busID,
                        "timestamp":item.timestamp
                    }
                };
                docClient.delete(param, function(err, data) {
                    if (err) {
                        console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                    } else {
                        console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                    }
                });
            });
        }
    });
}

function queryBusInfo(callback) {
    var params = {
        TableName : table
    };

    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            if (callback) {
                const responseErr = {
                    statusCode: 500,
                    headers: {
                        "Access-Control-Allow-Origin": "*"
                    },
                    body: JSON.stringify({'err' : err})
                };
                callback(null, responseErr);
            }
        } else {
            var list = [];
            data.Items.forEach(function(item) {
                list.push({id: item.busID, logo: item.logo, lat: item.lat,
                            longi: item.longi, route: item.route});
            });

            if (callback) {
                const responseOk = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin": "*"
                    },

                    body: JSON.stringify(list)
                };
                callback(null, responseOk);
            }
        }
    });
}
  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });