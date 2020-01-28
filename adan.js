this.go = function(g) {
	g.thing(g.transfer,global);
	
}
var empty = () => {};

function AdanServer(opts) {
	
	
	if(!opts) {
        opts = {}
    }
	
	this.on = (str, func) => {
		if(!t(opts.adanFunctions, Object)) {
			opts.adanFunctions = {};
		}
		if(
			t(opts.adanFunctions, Object) &&
			t(str, String)
		) {
			opts.adanFunctions[str] = func;
		}
	};
	
	var db;
	if(t(opts.database, Object)) {
		db = new cobase.Database(
			opts.database,
			did => {
				console.log("DID it", did);
				this.on(did.command.name, did.command.func)
			}
		);
		
	}
	
	
	var oserver = opts.server;
	
	var port = process.env.PORT || 
                    opts.port || 
                    this.port || 
                    80;
	if(oserver) {
		oserver.addListener("upgrade", function() {
//			console.log(arguments)
		});
		oserver.listen(port)
	}
    var wss = new web.Server(
		{server: oserver} || {
                port: process.env.PORT || 
                    opts.port || 
                    this.port || 
                    80
                    
            }
        );
	wss.on("listening", () => {
		var func = opts["onlisten"] || opts["listening"] || opts["onlistening"] || opts["start"] || opts["onstart"];
		if(t(func, Function)) {
			func();
		}
	});
    wss.broadcast = (msg, opts2) => {
        if(!opts2) {
            opts2 = {};
        }
    
        wss.clients.forEach(x => {
            if((opts2.current && opts2.current !== x) || opts2.current === undefined) {
                if(x.adan && x.adan.readyState == web.OPEN) {
                    if(!opts.isBinary) {
                        x.adan.send(msg);
                    } else {
                        x.adan.sendBinary(msg);
                    }
                }
            }
        });
    };
    
    wss.on("connection", (ws) => {
   //     console.log("cobyconnection!");
        var cs = new CobyAdan(ws, wss);
		if(db) {
			cs.database = db;
		}
        cs.server = wss;
        ws.adan = cs;
        (opts["onOpen"] || empty)(wss,cs);
        ws.stillConnected = true;
        ws.on("pong", () => {
            ws.stillConnected = true;
        });

        cs.onMessage = (msg) => {
            (opts["onAdanMessage"] || opts["onMessage"] || empty)(msg,cs);
            var funcs = opts["adanFunctions"];
            if(funcs) {
                funcs = Object.fromEntries(
                            funcs.entries().map(x => [
                                x[0].toLowerCase(),
                                x[1]
                            ])
                        );
                if(isObject(msg)) {
                    for(var k in msg) {
                        if(funcs[k.toLowerCase()]) {
							try {
								funcs[k.toLowerCase()](msg[k],cs);
							} catch(e) {
								console.log("some weird error: ", e);
							}
                        }
                    }
                }
            }
        };
		
		var binaryFuncts = opts.onBinaryMessage;
		if(binaryFuncts) {
			cs.onBinaryMessage = msg => {
				opts.onBinaryMessage(msg, cs);
			}
		}

        cs.onClose = () => {
            (opts["onClose"] || empty)(cs);
        }
    });
    var intervalDefault = 1000,
        checkForDisconnectionsInterval = setInterval(() => {
        wss.clients.forEach(x => {
            if(!x.stillConnected) {
                x.adan = null;
                x.terminate();
            }
            x.stillConnected = false;
            x.ping(() => {});
        });
    }, ((opts["intervalLength"]) || intervalDefault));
    this.stopInterval = () => {
        if(checkForDisconnectionsInterval) {
            clearInterval(checkForDisconnectionsInterval);
            checkForDisconnectionsInterval = null;
        }
    };
}




function CobyAdan(ws, wss) {
    var adan = ws;
    if(adan && adan.send) {
        this.sendBinary = (msg) => {
            var mymsg = stringOrJSON(msg);
            var binary = null;
            try {
                binary = Buffer.from(mymsg);
            } catch(e) {

            }

            if(binary) {
                adan.send(binary);
            }
        };

        this.send = (msg) => {
            var mymsg = stringOrJSON(msg);
            adan.send(mymsg);
        };

        this.onMessage = (msg) => {

        };
		/*
		this.onBinaryMessage = msg => {
			
		};*/

        this.onClose = (ws) => {

        };
        
        this.getServer = () => {
            return wss;
        };

        ws.on("message", (msg) => {
            if(this.onMessage) {
               
                var str = JSONorString(msg);
              
                this.onMessage(str);
				if(this.onBinaryMessage) {
				//	console.log("CHECKING", typeof msg, msg.constructor)
					if(t(msg, Buffer))
						this.onBinaryMessage(msg);
				}
            }
        });

        ws.on("close", (ws) => {
            this.onClose(ws);
        });
    }
    this.adan = adan;
}

this.AdanServer = AdanServer;
this.CobyAdan = CobyAdan;

module.exports = this;








function stringOrJSON(test) {
    var result;
    try {
        result = JSON.stringify(test);
    } catch(e) {
        if(test && test.constructor == String) {
            result = test;
        } else {
            result = test.toString();
        }
    }
    return result;
}

function isObject(thing) {
    return thing && thing.constructor == Object;
}

function JSONorString(test) {
    var result = {"nothing":"not a JSON or a string!"};
    if(test && test.constructor == Object) {
        result = test;
    } else {
        result = test.toString("utf-8");
    }
    try {
        result = JSON.parse(test);
    } catch(e) {
        
    }
    return result;
}

function splitCommandString(str) {
    return (str.match(/\\?.|^$/g).reduce((p, c) => {
        if(c === '"' || c === "'"){
            if(!(p.quote ^= 1)){p.a.push('');} 
        }else if(!p.quote && c === ' ' && p.a[p.a.length-1] !== ''){ 
            p.a.push('');
        }else{
            p.a[p.a.length-1] += c.replace(/\\(.)/,"$1");
        }
        return  p;
    }, {a: ['']}).a).map(x => x.trim());
}

function addToObj(base, addition) {
    return Object.fromEntries(
                Object.entries(base)
                .concat(
                    Object.entries(
                        addition
                    )
                )
            )
}

function t(val, cons) {
    return (
        (
            val || 
            val == 0 ||
            val == false ||
            val == ""
        ) ? 
            cons ?
                val.constructor == cons
            :
                val.constructor
        :
            false
    );
}

function defineObjectProperties() {
    Object.defineProperties(Object.prototype, {
        values: {
            value() {
                var result = [];
                for(var k in this) {
                    result.push(this[k]);
                }
                return result;
            }
        },
        entries: {
            value() {
                var result = [];
                for(var k in this) {
                    result.push([
                        k,
                        this[k]
                    ]);
                }
                return result;
            }
        }
        
    });
    Object.defineProperties(Object, {
        fromEntries: {
            value(input) {
                var result = {};
                input.forEach(x => {
                    result[x[0]] = x[1];
                });
                return result;
            }
        },
		
        values: {
            value(obj) {
                var result = [];
                for(var k in obj) {
                    result.push(obj[k]);
                }
                return result;
            }
        },
        entries: {
            value(obj) {
                var result = [];
                for(var k in obj) {
                    result.push([
                        k,
                        obj[k]
                    ]);
                }
                return result;
            }
        }
    });
}

function copyObj(obj) {
		var result = {};
		if(obj) {
			if(t(obj, Object)) {
				for(var k in obj) {
					result[k] = obj[k]
				}
			} else if(t(obj, Array) || obj.hasOwnProperty("length")) {
				result = [];
				for(var i = 0; i < obj.length; i++) result.push(obj[i])
			} else {
				result = obj;
			}
		}
		return result;
}