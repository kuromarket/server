var express = require('express');
var app = express();
var request = require('request');
var bodyParse = require('body-parser');

/**************************** EXPRESS Server **********************************/

var port = process.env.PORT || 8080;

// start the server
app.listen(port);
console.log('Server started! At http://localhost:' + port);


/******************************* Endpoints ************************************/

app.get('/api/openorders', function(req, res) {
	getOpenOrderIds().then(function(response) {
		res.status(200).json(response);
	});
});

app.get('/api/orderinfo', function(req, res) {
	var orderId = req.query.orderId;
	console.log('GET: /api/orderinfo/ for orderId: ' + orderId);
	getOrderInfo(orderId)
		.then(function(response) {
			res.status(200).json(response);
		}, function(error) {
			res.status(404).json(error);
		});
});

app.get('/api/fulfill', function(req, res) {
	var orderId = req.query.orderId;
	console.log('GET: /api/fulfill for orderId: ' + orderId);
	createFulfillment(orderId)
		.then(function(response) {
			res.status(200).json(response);
		}, function(error) {
			res.status(404).json(error);
		});
});

app.get('/api/closeorder', function(req, res) {
	var orderId = req.query.orderId;
	console.log('GET: /api/closeorder for orderId: ' + orderId);
	closeOrder(orderId)
	.then(function(response) {
		res.status(200).json(response);
	}, function(error) {
		res.status(404).json(error);
	});
});


/**************** Promises for Querying Shopify API Endpoints *****************/

/**
 * Uses Shopify API key and password to generate a URL. To build the URL for
 * an endpoint, simply specify the endpoint as stated in the Shopify API reference.
 * (e.g. buildURL('/admin/orders.json'))
 */
const API_KEY = '11b52725ecb2765fa954affa0e2eb4c1';
const PASSWORD = '1ef1790358d219e96f43b002090a5cc2';

function buildURL(endpoint) {
	return 'https://' + API_KEY + ':' + PASSWORD + '@kuro-market' +
		'.myshopify.com' + endpoint;
}

/**
 * Get the order ids of all open orders. The order ids can then be used to obtain
 * more information about the order, fulfill the order, etc.
 */
function getOpenOrderIds() {
	return new Promise(function(fulfill, reject) {
		request.get(buildURL('/admin/orders.json'), {
			qs: {
				status: 'open'
			}
		}, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var orders = JSON.parse(body).orders;
				var openOrderIds = [];
				for (var i = 0; i < orders.length; i++) {
					openOrderIds.push(orders[i].id);
				}
				fulfill(openOrderIds);
			} else {
				console.log('Error: could not get open order IDs.');
				reject(body);
			}
		});
	});
}

function getOrderInfo(orderId) {
	return new Promise(function(fulfill, reject) {
		request.get(buildURL('/admin/orders/' + orderId + '.json'),
			function(error, response, body) {
				if (!error && response.statusCode == 200) {
					var data = JSON.parse(body);
					fulfill(data);
				} else {
					console.log('Error: could not get info for order id: ' + orderId);
					reject(body);
				}
			});
	});
}

/**
 * Completes an ALREADY EXISTING fulfillment for an order. This should not be used
 * unless a fulfillment was manually created or for completing a partial fulfillment.
 * To create and complete a fulfillment for a new order, use createFulfillment().
 */
function fulfillOrder(orderId, fulfillmentId) {
	return new Promise(function(fulfill, reject) {
		request.get(buildURL('/admin/orders/' + orderId + '/fulfillments/' + fulfillmentId + '/complete.json'),
			function(error, response, body) {
				if (!error && response.statusCode == 200) {
					var data = JSON.parse(body);
					fulfill(data);
				} else {
					reject('Error: could not fulfill order.');
				}
			});
	});
}

/**
 * Get the fulfillment ids for a single order.
 */
function getFulfillmentIds(orderId) {
	return new Promise(function(fulfill, reject) {
		request.get(buildURL('/admin/orders/' + orderId + '/fulfillments.json'),
			function(error, response, body) {
				if (!error && response.statusCode == 200) {
					var fulfillments = JSON.parse(body).fulfillments;
					var fulfillmentIds = [];
					for (var i = 0; i < fulfillments.length; i++) {
						fulfillmentIds.push(fulfillments[i].id);
					}
					fulfill(fulfillmentIds);
				} else {
					console.log('Error, could not get fulfillment ids for order id ' + orderId);
					reject(body);
				}
			});
	});
}

/**
 * Creates a fulfillment for all the items in an order, and sets the fulfillment
 * status to 'success'.
 */
function createFulfillment(orderId) {
	return new Promise(function(fulfill, reject) {
		request.post(buildURL('/admin/orders/' + orderId + '/fulfillments.json'), {
				form: {
					"fulfillment": {
						"tracking_number": null
					}
				}
			},
			function(error, response, body) {
				if (!error && response.statusCode == 201) {
					var body = JSON.parse(body);
					fulfill(body);
				} else {
					console.log('Error, could not create fulfillment for order id ' + orderId);
					reject(body);
				}
			});
	});
}

function closeOrder(orderId) {
	return new Promise(function(fulfill, reject) {
		request.post(buildURL('/admin/orders/' + orderId + '/close.json'), {
				form: {}
			},
			function(error, response, body) {
				if (!error && response.statusCode == 200) {
					var body = JSON.parse(body);
					fulfill(body);
				} else {
					console.log('Error, could not close order for order id ' + orderId);
					reject(body);
				}
			});
	})
}
