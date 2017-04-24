const Express = require("express");

let configuration = require("./configuration.json");

let application = new Express();

for (let route in configuration.routes) {
	const Handler = require(configuration.routes[route].handler);
	let handler = new Handler(Object.assign(
		configuration.configuration || {},
		configuration.routes[route].configuration || {}
	));
	application[configuration.routes[route].method](route, (handler.process).bind(handler));
}

application.use("/", Express.static(configuration.configuration.public));

application.listen(configuration.configuration.port);
