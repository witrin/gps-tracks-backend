const Path = require("path");
const Filesystem = require("fs");
const Chokidar = require("chokidar");

/**
 * Handle HTTP requests for GPS track data
 */
class TracksHandler {
	/**
	 * Construct HTTP handler
	 *
	 * @param {Object} configuration Handler configuration
	 */
	constructor(configuration) {
		this._pattern = RegExp(/([0-9]+)\.json/);

		this._configuration = Object.assign(
			{
				data: Path.join(Path.dirname(process.argv[1]), "data") + "/"
			},
			configuration
		);

		this._cacheTracks();
		this._watchTracks();
	}
	/**
	 * Process HTTP request
	 *
	 * @param {Object} request HTTP request
	 * @param {Object} response HTTP response
	 */
	process(request, response) {
		if (request.params.id) {
			if (request.params.id in this._data) {
				this._getTrack(request.params.id).then((function (data) {
					try {
						let coordinates = data.features[0].geometry.coordinates;
						response.writeHeader(200, { "Content-Type": `text/json; charset=${this._configuration.charset}` });
						response.write(JSON.stringify(coordinates));
						response.end();
					}
					catch (error) {
						console.log(error);
						response.writeHeader(500);
						response.end();
					}
				}).bind(this)).catch(function (error) {
					console.log(error);
					response.writeHeader(500);
					response.end();
				});
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
	/**
	 * Cache meta data of all GPS tracks
	 */
	_cacheTracks() {
		this._data = {};

		Filesystem.readdir(this._configuration.data, (function (error, files) {
			if (!error) {
				for (let file of files) {
					let id = file.replace(this._pattern, "$1");
					this._cacheTrack(id);
				}
			}
			else {
				throw Error(`Can not read data from ${this._configuration.data}`);
			}
		}).bind(this));
	}
	/**
	 * Watch changes of all GPS tracks
	 */
	_watchTracks() {
		this._unwatchTracks();

		this._watcher = Chokidar.watch(this._configuration.data);

		this._watcher.on("add", (function (path) {
			let id = Path.basename(path).replace(this._pattern, "$1");

			if (id) {
				this._cacheTrack(id);
			}
		}).bind(this)).on("change", (function (path) {
			let id = Path.basename(path).replace(this._pattern, "$1");

			if (id in this._data) {
				this._cacheTrack(id);
			}
		}).bind(this)).on("unlink", (function (path) {
			let id = Path.basename(path).replace(this._pattern, "$1");

			if (id in this._data) {
				delete this._data[id];
			}
		}).bind(this));
	}
	/**
	 * Unwatch all GPS tracks
	 */
	_unwatchTracks() {
		if (this._watcher) {
			this._watcher.unwatch(this._configuration.data);
		}
	}
	/**
	 * Cache meta data of a GPS track
	 *
	 * @param {string} id Id of the GPS track
	 */
	_cacheTrack(id) {
		this._getTrack(id).then((function (data) {
			try {
				let properties = data.features[0].properties;
				this._data[id] = Object.assign(properties || {}, { id: id });
			}
			catch (error) {
				delete this._data[id];
				throw Error(`Unexpected format in ${id}`);
			}
		}).bind(this)).catch((function (error) {
			delete this._data[id];
			throw Error(`Reading data from ${id} failed: ${error}`);
		}).bind(this));
	}
	/**
	 * Get all data from a GPS track
	 *
	 * @param {string} id Id of the GPS track
	 * @return {Promise}
	 */
	_getTrack(id) {
		return new Promise((function (resolve, reject) {
			Filesystem.readFile(this._configuration.data + id + ".json", function (error, buffer) {
				if (error) {
					reject(error);
				}
				try {
					let data = JSON.parse(buffer.toString());
					resolve(data);
				}
				catch (error) {
					reject(error);
				}
			});
		}).bind(this));
	}
}

module.exports = TracksHandler;
