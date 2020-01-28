this.go = function(g) {
	g.thing(g.transfer,global);
}
var mongo,
	self = this,
	empty = ((w,c)  => {}),
	commands = {
        "find": [
            {"find":["query", "limiter"]},
            {"toArray":"callback"}
        ], 
        "sort": [
            {"find":[]},
            {"sort":["query", "limiter"]},
            {"toArray":"callback"}
        ],
        "limit": [
            {"find":[]},
            {"limit":"number"},
            {"toArray":"callback"}                     
        ],
        "aggregate": [
            {"aggregate": ["query"]},
            {"toArray":"callback"}
        ],

        "drop": "callback",
        "insertMany": ["array", "callback"],
        "remove": ["query", "callback"],
        "deleteOne": ["query","callback"],
        "delete": ["query","callback"],
        "findOne": ["query", "callback"],
        "insertOne": ["query", "callback"],
        "insert": ["query", "callback"],
        "updateOne": ["query", "newvalues", "callback"],
        "update": ["query", "newvalues", "callback"],
        "createCollection": ["string", "callback"]
    },
	adminCommands = {
		listDatabases: ["admin", "then"],
		dropDatabase: ["db"],
		listCollections: ["db", "toArray"]
	},
    cmd2Role = {
        "find":"R",
        "findOne":"R",
        "sort":"R",
        "limit":"R",
        "deleteOne":"RW",
        "insertOne":"RW",
        "remove":"RW",
        "drop":"RW",
        "updateOne":"RW",
        "aggregate":"RW",
        "createCollection":"RW",
        "insertMany":"RW",
		"listDatabases":"ADMIN"
    },
	greaterRoles = {
		"ADMIN": [
			"RW",
			"R",
			"ADMIN"
		],
		"RW": ["RW", "R"],
		"R": ["R"]
	},
    activeConnections = {},
	curName = "connection#",
	curIndex = 0;
this.premadeFunctions = {
	"database command": (data) => {
		console.log("LOL",data);
		var superAdmin = t(data.superAdmin, Object) ? data.superAdmin : {
			username:"admin",
			password:"superAdmin123"
		};
		
		var userInfoDB = data.userInfoDB;
		var infoCollection = data.userInfoCollection;
		var resultFunc = function(msg, cs) {
			
			var databaseConnection = self.defaultConnection();
			if(databaseConnection != null) {
				var cmd = {
					...msg,
					userInfoDB: userInfoDB,
					infoCollection:infoCollection
				};
				if(!cmd.user) cmd["user"] = cs["user"] ? cs.user : {};
				var callbackName = msg.callback || "database result";
				var adminLogin = cmd["validateAdmin"] || cmd.user.rolePermissions == "admin";
				cmd.connection = databaseConnection;
				cmd.onfinish = (r,e) => {
					var sendObj = {};
					sendObj[callbackName] = {
						success: r,
						error: e
					};
				
					cs.send(sendObj);
				};
				//user has accesss to something
				
				try {
					if(!t(adminLogin, Object)) {
						if(!cmd.user.verified) {
							console.log("checking something", cmd.user)
							verifyUser({
								connection: databaseConnection,
								validate: msg.user,
								database:userInfoDB,
								collection:infoCollection
							}, (succ, not, roleP) => {
								console.log("did something",succ, not, roleP)
								if(!cs.user) cs.user = {}
								if(succ) {
									cs.user.verified = true;
								}
								if(roleP) {
							
									cs.user.rolePermissions = roleP
									console.log("USERED", cs.user);
								}
								
								/* else {
										cmd.onfinish(false,`yo man, you're not even anything, don't even go back here unless you enter a verified admin and / or actual user, man!!!`);
										
								}*/
								
									cmd.onfinish(succ,not)
								 	self.command(cmd);
								
							});
						} else {
								//console.log("already verified",cmd.user.rolePermissions);
						//		console.log("trying to do", cmd);
								try {
									
									self.command(cmd);
								} catch(e) {
									console.log("LOL?",e)
									cmd.onfinish(false,"DID I DO IT?" + e.toString());
								}
							}
					} else {
						var sendObj = {};
						if(superAdmin) {
							if(
								adminLogin["username"] == superAdmin["username"] &&
								adminLogin["password"] == superAdmin["password"]
							) {
								cmd.onfinish("verified admin")
								cs["user"] = {
									rolePermissions:"admin"
								}
							} else {
								cmd.onfinish(false,"wrong credenntials")
								cs.user = false;
							}
						}	
						
					}
					
				} catch(e) {
									cmd.onfinish(false,"CHECKING in" + e);
								}

			} else {
				console.log("could not connect to database")
			}
		}
		
		return resultFunc;
	},
	validateAdmin(psObj) {
		var pswrd = psObj["password"];
		var resultFunc = function(msg, cs) {
			
			var so = {};
			var cb = t(msg.callback, String) ? msg.callback : "validated";
		
			if(msg === pswrd) {
				so[cb] = "success";
				cs["user"] = {
					role: "admin"
				};
			} else {
				so[cb] = "fail";
			}
			cs.send(so);
		}
		return resultFunc;
	},
	
	getDatabases(msg, cs) {
		var dc = self.defaultConnection();
		if(dc != null) {
		
			dc.db("a").admin().listDatabases().then(r => {
				
				cs.send({
					"database result": r
				});

			});
		}
	},
	adminCommand(msg, cs) {
		var cbName = msg.callback || "msg";
		adminCommand(msg, function(rez, err) {
			var so = {};
			so[cbName] = {
				success: rez,
				error: err
			}
			cs.send(so);
		})
	}
};


this.connect = (opts) => {
	
	!mongo && (() => {
		try {
			mongo = require("mongodb");
		   
		} catch(e) {
			console.log(e);
		} 
	})();
	console.log(mongo, "MONG?");
	
	if(mongo) {
  
		cobaseClient = mongo.MongoClient;
		if(!opts) {
			opts = {};
		}
		
		
		var url = opts.url || null,
			cb = opts.onfinish || opts.done || opts.ready,
			conName = t(opts.name, String) || curName + (curIndex++),
			listeners = opts.listeners || {};

		cobaseClient.connect(url, {
			reconnectTries: Number.MAX_VALUE,
			reconnectInterval: 1000,
			useNewUrlParser:true,
			useUnifiedTopology: true
		}, (err, conn) => {
			if(conn) {
			conn.conName = conName;
				if(conName && conName.constructor == String) {
					conn.listeners = listeners;
					activeConnections[conName] = conn;
					
				}
			}
			if(t(cb,Function)) {
				cb(conn, err);
			}
		});
	}
};

this.connections = () => {
	return activeConnections;
};

this.defaultConnection = () => {
	var c = this.connections(),
		e = Object.entries(c);
	return e.length > 0 ? c[e[0][0]] : null;
};

this.command = (inputOpts) => {
	var opts = inputOpts && inputOpts.constructor == Object ? inputOpts : {}, 
		command = opts.command || "find",
		connection = opts.connection || this.defaultConnection();
		if(connection && connection.listeners) {
			for(var l in connection.listeners) {
				var cl = connection.listeners[l];
				for(var k in opts) {
					if(cl.constructor == Function) {
						cl(opts[k]);
					}
				}
			}

		}
	
		var user = t(opts.user, Object) ? opts.user : {},
			role = user.rolePermissions,
			verified = true,
			callback = (res,err) => {
				//console.log(res,err);
					(opts.onfinish || opts.done || opts.ready || empty)(err,res);
				}
		if(role) {
			verified = checkRole({
				database: opts.database,
				collection:opts.collection,
				query:opts.query,
				rolePermissions: role,
				command:command
			})
		}
		
		if(verified) {
	//		console.log("verified", verified, role);
			var projection = opts.projection || {};
			if(t(verified, Object)) {
				projection = addToObj(projection, verified)
			}
			var database = t(opts.database,String) ? opts.database : null,
			
			
			activeDB =  connection && database && t(connection.db, Function)? 
							connection.db(database)
						:
							null,
			collectionName = opts.collection || null,
			collectionObj = activeDB && t(collectionName, String) ? 
								activeDB.collection(collectionName)
							:
								null,
			query = t(opts.query, Object) ?  
						Object.fromEntries(
							Object.entries(opts.query).map(x => {
								var result = [
									x[0], x[1]
								];
								
								if(
									x[0] == "_id" && t(x[1], String)
								) {
								//	console.log("ID????", x, x[1], query)
									try {
										result[1] = new mongo.ObjectID(x[1])
									
									} catch(e) {
										
									}
								}
									
								return result;
							})
						) : t(opts.query, Array) ? opts.query : {},
			updateObj = copyObj(opts.updated),
			newValues = {
				
			};
			if(opts.unset) {
			//	console.log("UNSET?", opts.unset);
			}
			if(
				t(opts.unset, Object) &&
				Object.entries(opts.unset).length > 0
			) {
				newValues["$unset"] = opts.unset
			}
			
			if(
				t(opts.updated, Object) &&
				Object.entries(opts.updated).length > 0
			) {
				newValues["$set"] = opts.updated
			}
		var	cmdObj = newCommands()[command] || {},
			limiter = {
				projection: projection || {}
			}, 
			cmdNameToVar = {
				query:query,
				callback:callback,
				string:
					query.constructor == String ?
						query
					:  
						query.toString(),
				newvalues:newValues,
				array:
					query.constructor == Array ?
						query
					:
						[query],
				number:
					query.constructor == Number ?
						query
					:
						0,
				limiter:limiter
			}
			
	//		console.log("EW??", newValues, opts);
		
			var adminCmd = adminCommands[command]
			
			if(connection && activeDB && collectionObj && !adminCmd) {
				
					/*
						cmdObjcurrently in format: {commandNameKey: [stringArrayOfTheoreticalValues]}
						need to get in format
						[{
							name: commandNameKey1InCommandChainOfCollection,
							arguments: fixedArrayOfActualArgumentsBasedOnStringArray
						},...]

						First just turn theoretical array to actual array, easy
					*/

					
					
					var fullArray = [];
					cmdObj.forEach(c => {
						var actualizedObj = {};
						for(var k in c) {
							var newElement = c[k];
							
							if(t(c[k], Array)) {
								newElement = c[k].map(x => 
									cmdNameToVar[x]
								);
							}
							actualizedObj[k] = newElement;
						}
						fullArray.push(actualizedObj);
					})
					
				   
					/*
					back to above comment
					*/
					var arrayOfObjectNamesAndArguments = fullArray.map(x => 

							({
								"name": Object.entries(x)[0][0],
								"arguments":Object.entries(x)[0][1]
							})  
						
   
					);
						console.log("COMAND", cmdObj, query, command, arrayOfObjectNamesAndArguments)
					arrayOfObjectNamesAndArguments.reduce((r, {name:funcName, arguments: args}) => 
								r[funcName](...args), 
								collectionObj
					)
				
			} else if(connection && adminCmd) {
				
				var obj = {};
				if(database) {
					obj.database = database;
				}
				if(command) {
					obj.command = command;
					obj.connection = connection;
				
					adminCommand(obj, (r,e) => {
					
						if(callback) {
							callback(r,e);
						}
					})
				}
			}
		} else {
//			console.log("not verified?");
			callback("You're not authorized to do that", null);
		}

}
	
this.Database = function(opts, cb) {
	if(t(opts, Object)) {
		var d = opts;
		if(!t(cb, Function)) {
			cb = () => {};
		}
	
		var userInfo = t(d.userDB, String) ? d.userDB : "userInfo";
		var colName = "info";
		var url = d.url;
		
			console.log("LOL", d);
		
		var admin = t(d.admin, Object) ? d.admin : {};
		var duser = admin.username || "admin";
		var dpswrd = admin.password || "adminPassword"+Math.pow(Math.random(), Math.random() * 3) + Date.now()
		if(t(url, String)) {
			self.connect({
				url,
				onfinish(er,con) {
					
						
			//			console.log("About to do it")
						self.command({
							connection: con,
							command:"listCollections",
							database:userInfo,
							admin:true,
							user: {
								role:"admin"
							},
							onfinish(er,s) {
						//		console.log("GOT IT!!", er, s)
								if(t(s, Array)) {
									var addCmd = {
											connection: con,
											database:userInfo,
											collection: "users",
											command: "insertOne",
											query: {
												username: duser,
												password: dpswrd
											},
											admin:true,
											user: {
												role:"admin"
											},
											onfinish(er,s) {
												if(!er) {
						//							console.log("DID IT for users?!", er, s);
												} else {
						//							console.log(er);
												}
											}
										}
									var users = s.find(x => x.name == "users");
									if(!users) users = [];
									console.log("USE", users);
									if(
										!s.find(x => x.name == "users")
										
									) {
										self.command(addCmd)
									} else {
										var findCmd = {
											...addCmd,
											command: "find",
										
											query: {},
											onfinish: (r,e) => {
												if(r && t(r, Array)) {
													console.log("FOUND", r.find(x => x.username == duser), d, admin, duser, t(admin), d.admin)
													if(
														!r.find(
															x => x.username == duser
														) 
													) {
														self.command(addCmd);
													}
												
												}
												console.log(r,e,"OKKK??")	
											}
										}
										console.log("DOING", findCmd);
										self.command(findCmd);
									}
									if(!s.find(x => x.name == "roles")) {
							
										self.command({
											connection: con,
											database:userInfo,
											collection: "roles",
											command: "insertMany",
											query: [
												{
													name:"admin",
													permissions:"*"
												},
												{
													name:"yeled",
													permissions: "cobs.*:RW, local.*:R, userInfo.users:R"
												}					
											],
											admin:true,
											user: {
												role:"admin"
											},
											onfinish(er,s) {
												if(!er) {
										//			console.log("added oles!", s);
												}  else {
								//					console.log(er);
												}
												//console.log("DID IT?!", er, s);
												
											}
										})
									}
									
									
								}
							}
						});
						if(t(d.onfinish, Function)) {
							d.onfinish("HELLO!?!",er,con);
						}
						var dbs = t(d.databaseCommand, String) ? d.databaseCommand : "databaseCommand";
						this.command = {
							name: dbs,
							func: self.premadeFunctions["database command"]({
								superAdmin: d.admin || {},
								userInfoDB: userInfo,
								userInfoCollection: colName
							})
						};
						cb(this);
					
				}
			})
		}
	}
}
	



function newCommands() {
	
	
	var everythingInArray = Object.fromEntries
	(
		Object.entries(commands).map(x => 
			[
				x[0],
				t(x[1], Array) &&
				!t(x[1][0], Object) ? [Object.fromEntries(  //if this command is an array that means it has only one function: it's own key
					[
						[
							x[0],
							x[1]
						]
					]
				)] : 
				!t(x[1][0], Object) ?
					[
						Object.fromEntries([
							[
							   x[0],
							   x[1]
							]
						   
						])
					] 
				: 
					x[1]
			]    
		)
	);

	var secondWaveOfSubArrays = Object.fromEntries
	(
		Object.entries(everythingInArray).map(x =>
			[
				x[0],
				t(x[1], Array) ? x[1].map(y => 
					Object.fromEntries(
						Object.entries(y).map(z => 
							[
								z[0],
								t(z[1], Array) ? z[1] : [z[1]]
							]
						)
					)
				)
				
					
				: [x[1]]
			]
		)
	);
   
	return secondWaveOfSubArrays;
}


function adminCommand(msg, cb) {
			
	var opts = t(msg, Object) ? msg : {},
		dbName =    t(opts["database"], String) ? opts.database : null,
		callbackName = opts.callback || "admin result",
		dc = opts.connection || self.defaultConnection();
	if(dc != null && t(dc.db, Function)) {
		
		var db = dc.db(dbName),
			admin = db.admin(),
			adminCmd = t(opts["command"], String) ? opts.command : null,
			what = adminCommands[adminCmd],
			subCmd;
		if(t(what, Array) && what.length > 1) {
			subCmd = what[1]
		} else {
			subCmd = "then";
		}
	
		var dbFunc = false,
			adminFunc = false;
		if(db && t(adminCmd, String) && t(db[adminCmd], Function)) {
			dbFunc = true
		} else if(t(admin[adminCmd], Function)) {
			adminFunc = true
		}
		if(adminFunc || dbFunc) {
			(dbFunc ? db : adminFunc ? admin : {})[adminCmd]()[subCmd]((er,r) => {
				
				if(t(cb, Function)) {
					cb(r, er);
				}
			
			});
			
		} else {
			cb(null, "NOPE");
		}
	
	}
}

function checkRole(obj) {
	var rs = obj.rolePermissions,
		dbname = obj.database,
		col = obj.collection,
		q = obj.query,
		c = obj.command;
		r = rs == "*" || rs == "admin";
	if(t(rs, String)) {
		var fields = rs.trim().split(",");
		var dbs = fields.map(function(x) {
			var str = x.trim();
			
			var o = {
				
			};
			if(x.indexOf(":") < x.length - 1) {
				o["permission"] = x.split(":")[1];
				str = str.replace(
					":" + x.split(":")[1], ""
				)
			}
			
			var lvls = str.split(".");
			
			if(lvls[0]) {
				o["database"] = lvls[0]
			}
			if(lvls[1]) {
				o["collection"] = lvls[1]
			}
			if(lvls[2]) {
				o["field"] = lvls[2];
			}
			
			
			return o;
		});
		
		var hasDB = dbs.find(x => x.database == dbname)
		if(hasDB) {

			if(
				hasDB.collection === "*" ||
				hasDB.collection === col
			) {
				var fieldKeys = [];
				for(var k in query) {
					
				}
		
				if(t(c, String)) {
					var cmd = cmd2Role[c];
					
			
					if(t(hasDB.permission, String)) {
						var gr = greaterRoles[hasDB.permission];
					
						var has = !!gr.find(
							x => x == cmd
						);
						if(
							t(hasDB.field, String) && 
							has
						) {
							r = {};
							r[hasDB.field] = 1;
							r["_id"] = 0;
						} else {
							r = has;
						}
						
				
						
					}
				}
			}
		}
			
	}
	
	return r;
}

function verifyUser(data, cb) {
	var userData = data.validate;
	var con = data.connection
	if(userData) {
//	
		var uname = userData.username;
		var pwrd = userData.password;
		var database = data.database;
		if(database) {
	
			var userInfoCollection = {
				database: database,
				collection: "users",
				query: {
					username: uname
				},
				connection: con,
				command:"find",
				onfinish: (r, er) => {
					
			
						var user = r[0];
						if(user) {
							
				
							if(user.password === pwrd) {
								var role = user.role
								if(role) {
									self.command({
										database: database,
										collection: "roles",
										connection: con,
										command: "find",
										query: {
											name:role
										},
										onfinish(r,e) {
											var myrole = r
											if(myrole) {
												cb("login success", er, myrole);
											} else {
												cb(null,"something else happened!" + JSON.stringify(e));
											}
										}
									})
								} else {
									cb("login success",er);
								}
							} else {
								cb(null, "wrong password")
							}
						} else {
							cb(null, "user not found");
						}
					
				}
			};
			if(con) {
				
				self.command(userInfoCollection);
			}
		}
	}
	
}













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