var coby = require("./COBY.js");
var os = require("os");
//console.log(coby)
var pictures = [],
	names = [],
	yolo=0;
coby.adanServer({
	port:771,
	server: require("http").createServer(function(q,r) {
		/*console.log(names,pictures,JSON.stringify(pictures.map(x=> (
						{
							id: x.id
							
						}
					))));*/
					console.log(q.url.replace("/", ""), q.method);
		if(q.method != "POST") {
			coby.readFile("./pictures" + q.url, (er, data) => {
		//		console.log(q.headers.host + q.url);
				if(!er) {
					
					r.end(data);
				} else {
					console.log("hi", yolo);
					var p = pictures.find(x => x.id == q.url.replace("/", ""))
					if(p) {
						r.end(p.data);
					} else {
						if(pictures.length > 1) {
							r.end(JSON.stringify(pictures.map(x=> (
								{
									id: x.id
									
								}
							))));
						} else {
							r.end("nsssssone!!!");
						}
					}
				}
			})
		} else {
			var s = "";
			q.on("data", d=> {
				s += d.toString();
			});
			q.on("end", () => {
				r.end("PST: " + s);
			});
			
		}
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
		
		/*coby.writeFile("pictures/" + fileID, m, () => {			
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
		});*/
		pictures.push({
			id:fileID,
			data:m
		});
		yolo = Date.now() + "LOL";
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
	},
	onOpen(c) {
		console.log("WELCOME!");
	},
	database: {
		url:"mongodb+srv://cobykauf:ksavyad770@cluster0-7rlpg.mongodb.net/test?retryWrites=true&w=majority",
		databaseCommand: "coybia",
		validateAdmin: "adminate",
		userDB: "userInfo",
		admin: {
			username: "coby",
			password: "kaufer"
		},
		onfinish(con,err) {
			if(err) {
				console.log("BIG ERROR",err);
			} else {
				console.log("connecte!",con);
			
			}
		}
	}
});

