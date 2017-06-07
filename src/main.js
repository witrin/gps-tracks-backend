const Express = require("express");

// load configuration from file
let configuration = require("./configuration.json");

// override common configuration section with process arguments
process.argv.slice(2).forEach(function (value) {
	if (value.startsWith("--")) {
		let option = value.substring(2).split("=");
		configuration.common[option[0]] = option[1];
	}
});

// use express as a simple web server
let application = new Express();

// create routes for the REST API
for (let route in configuration.routes) {
	const Handler = require(configuration.routes[route].handler);
	// allow configuration overriding for routes
	let handler = new Handler(Object.assign(
		configuration.common || {},
		configuration.routes[route].common || {}
	));
	application[configuration.routes[route].method](route, (handler.process).bind(handler));
}

// use root path for a static web server
application.use("/", Express.static(configuration.common.public));

// start web server on the given port
application.listen(configuration.common.port);
