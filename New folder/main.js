var coby = require("./COBY.js")

coby.adanServer({
	port:771,
	adanFunctions: {
		hi(there, cs) {
			console.log("hi! ", there);
			cs.send({
				hi: "back" + there
			})
		},
		startRecording(ms, cs) {
			cs.recordInfo = {
				name: ms.name || "f_"+Date.now(),
				callback: ms.callback || null,
				framesDone: 0,
				id: "id_" + Date.now(),
				start: Date.now()
			};
			cs.send({
				[ms.callback||"asdf"]:{}
			})
			console.log("RECORD?", cs.recordInfo)
		}	
	},
	onBinaryMessage(m, cs) {
		var name;
		if(cs.recordInfo) {
			name =/* cs.recordInfo.id + 
				"/" +*/ "./files/" +cs.recordInfo.framesDone + "__" +  (cs.recordInfo.start - Date.now()) + "_"
				+ cs.recordInfo.name ;
			//
			/*	if(cs.recordInfo.callback) {
					cs.send({
						[cs.recordInfo.callback]: cs.recordInfo.start
					})
				}
					*/
		}
	//	console.log("NAMELY", name, cs.recordInfo);
		coby.writeFile(name, m, () => {			
			if(cs.recordInfo) {
				cs.recordInfo.framesDone++;
				if(cs.recordInfo.callback) {
					cs.send({
						[cs.recordInfo.callback]: cs.recordInfo	
					})
					cs.recordInfo.start = Date.now()
				}
			}
		});
		
	},
	onOpen(c) {
		console.log("WELCOME!");
	}
});

require("http").createServer(function(q,r) {
	r.end("<b> Hello </b>");
}).listen(770, function(s) {
	console.log("Listening!", s);
});