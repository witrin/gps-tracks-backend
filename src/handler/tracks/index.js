const Path = require("path");
const Filesystem = require("fs");

class TracksHandler {

	constructor(configuration) {
		this._configuration = Object.assign(
			{
				data: Path.join(process.cwd(), "data") + "/"
			},
			configuration
		);
		this._data = {};

		this._cache();
	}

	process(request, response) {
		if (request.params.id) {
			if (request.params.id in this._data) {
				Filesystem.readFile(this._configuration.data + request.params.id + ".json", (function (error, buffer) {
					if (!error) {
						response.writeHeader(200, { "Content-Type": `text/json; charset=${this._configuration.charset}` });
						response.write(JSON.stringify(JSON.parse(buffer.toString()).features[0].geometry.coordinates));
					}
					else {
						response.writeHeader(500);
					}
					response.end();
				}).bind(this));
			}
			else {
				response.writeHeader(404);
				response.end();
			}
		}
		else {
			response.writeHeader(200, { "Content-Type": `text/json; charset=${this._configuration.charset}` });
			response.write(JSON.stringify(Object.keys(this._data).map((function (key) {
				return this._data[key];
			}).bind(this))) || "");
			response.end();
		}
	}

	_cache() {
		Filesystem.readdir(this._configuration.data, (function (error, files) {
			if (!error) {
				let pattern = new RegExp(/([0-9]*)\.json/);

				for (let file of files) {
					let id = file.replace(pattern, "$1");

					Filesystem.readFile(this._configuration.data + file, (function (error, buffer) {
						try {
							this._data[id] = Object.assign(
								JSON.parse(buffer.toString()).features[0].properties,
								{ id: id }
							);
						}
						catch (error) {
							console.log(error);
						}
					}).bind(this));
				}
			}
			else {
				throw Error(`Expected data in ${this._configuration.data}`);
			}
		}).bind(this));
	}
}

module.exports = TracksHandler;
