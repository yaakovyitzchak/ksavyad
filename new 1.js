var coby = require("coby-node");
coby.adanServer({
	port:711,
	adanFunctions: {
		noyouId(msg, cs) {
			console.log("just got: ", msg);
			cs.send({
				welcomeBack: {
					hi:123 + msg
				}
			});
		},
		databasis: coby.tafkids["database command"]({
			superAdmin: {
				username:"wowby",
				password:"2431"
			}, roles: {
				"admin":"*"
			}
		}),
		validateAdmin: coby.tafkids["validateAdmin"]({
			password:"2431"
		})
	},
	onMessage(m) {
		console.log("got a MSG:", m);
	},
	onOpen() {
		console.log("welcome to the par-tea");
	},
	start() {
		console.log("started server!");
		coby.mongo.connect({
			url:"mongodb://localhost:1000",
			onfinish(err, conn) {
				if(err) {
					console.log(err);
				} else {
					console.log("we got into this base of data ", coby.mongo.defaultConnection().conName);
				}
			}
		});
	}
});
