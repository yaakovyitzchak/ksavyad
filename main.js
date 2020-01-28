var coby = require("./COBY.js");
var os = require("os");
//console.log(coby)jjj
coby.adanServer({
	port:771,
	server: require("http").createServer(function(q,r) {
		coby.readFile("./pictures" + q.url, (er, data) => {
	//		console.log(q.headers.host + q.url);
			if(!er) {
				
				r.end(data);
			} else {
				console.log(er);
				r.end("<b> Hello </b>");
			}
		})
	}),
	adanFunctions: {
		hi(there, cs) {
			console.log("hi! ", there);
			cs.send({
				hi: "back" + there
			})
		},
		getEntry(msg, cs) {
			coby.cobase.command({
				database: "main",
				collection: "entries",
				onfinish(r,e) {
					cs.send({
						[msg.callback]: {
							success: r,
							error: e
						}
					});
				}
			})
		},
		file(m, cs) {
			if(!t(cs.uploadInfo, Object)) cs.uploadInfo = {};
			if(!t(cs.uploadInfo.files, Array)) cs.uploadInfo.files = [];
	//		if(!t(cs.uploadInfo.fileIDs, Array)) cs.uploadInfo.fileIDs = [];
			if(t(m, Object)) {
				if(m.name && m.size && m.type) {
					var validTypes = "jpeg tiff png bmp";
					console.log("YO GOT NEW PIC", m);
					cs.uploadInfo.files.push({
						...m,
						
					});
					
					
					if(t(m.callback, String)) {
						cs.uploadInfo.callback = m.callback;
						cs.uploadInfo.uploadCallback = m.uploadCallback;
						var er = null;
						var valid = false;
						validTypes.split("").forEach(x => {
							if(m.type.includes(x)) {
								valid = true;
							}
						});
						if(!valid) {
							er =  "Wrong type of image, only " + 
							validTypes.split(" ").join(", ") + 
							" formats are supported";
								
						}
						cs.send({
							[m.callback]: {
								file: m.name,
								error: er
							}
						})
					}
				}
			}
		}
	},
	onBinaryMessage(m, cs) {
		console.log("BIND?", m);
		var type = cs.uploadInfo.files[0].type.replace("image/", "")
		var fileID  = "file_" + Date.now() + "." + type
		
		coby.writeFile("pictures/" + fileID, m, () => {			
			if(cs.uploadInfo) {
				cs.uploadInfo.files[0].fileID = fileID
				if(cs.uploadInfo.uploadCallback) {
					
					cs.send({
						[cs.uploadInfo.uploadCallback]: {
							"got slice": cs.uploadInfo
						}
					})
				}
			}
		});
	},
	onOpen(c) {
		console.log("WELCOME!");
	},
	database: {
		url:"mongodb://localhost:27017",
		databaseCommand: "coybia",
		validateAdmin: "adminate",
		userDB: "userInfo",
		admin: {
			username: "coby",
			password: "kaufer"
		},
		onfinish(con,err) {
			if(err) {
				console.log(err);
			} else {
				console.log("connecte!");
			
			}
		}
	}
});

