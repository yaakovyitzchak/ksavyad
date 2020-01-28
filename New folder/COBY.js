var web = require("ws"),
    spawn = require("child_process").spawn,
	fs = require("fs"),
    cobaseClient,
    babeljs,
    vm = require("vm"),
	cobase = coquire("./cobase.js"),
	adan = coquire("./adan.js"),
    fetch = null,//require("node-fetch"),
  //  google = require("googleapis").google,
    
    empty = ((w,c)  => {}),
    ctxTemplate = {
        document: {
            body: {
                appendChild:empty,
                addEventListener:empty
            },
            head: {
    
            },
            getElementsByTagName:empty,
            getElementById:empty,
            querySelector:empty,
            querySelectorAll:empty,
            createElement:empty,
            createElementNS:empty,
            styleSheets:[],
            addEventListener:empty
        }
    },
	sheets,
    self = {

    },
	premadeFuncs = {
		
	}
	
	
function globalize(from, to) {
	
	for(var i in from) {
		to[i] = from[i];
	}
	//console.log("From", from, "to",to)
}

//console.log("HI",cobase)
function coquire(module) {
	
	var reqt = require(module);
	if(
		reqt && 
		t(reqt.go, Function)
	) {
		reqt.go({
			thing: globalize,
			transfer:  {
				hiThere: 5,
				cobase: cobase,
				adan: adan,
				web: web,
				empty: empty,
				t: t,
				
			}
			
		});
	}
	return reqt;
}

defineObjectProperties();
self.tafkids = premadeFuncs;
self.writeFile = (name, binary, cb) => {
	fs.writeFileSync(name || ("file_" + Date.now()), binary);
	if(t(cb, Function)) {
		cb();
	}
};
self.bavel = new function() {
    this.transform = (code, onerr = empty) => {
        if(babel != null) {
            try {
            return babel.transform(code, {
                presets: ["@babel/preset-env"]
                }).code.replace(`"use strict";`, "");
            } catch(e) {
                onerr(e);
                return null;
            }
        
        } else {
            onerr("YO didn't find that babel installed at all");
            return null;
        }
    };
    
};

self.globalize = globalize;
self.get = (url, opts) => {
  /*  return fetch ? (new Promise((r,rr) => {
        fetch(url, opts).then(b=>b.text()).then((b,e) => {
            if(e) rr(e);
            r(b);
        })) : "";
    });*/
};

self.import = async (url, myG = null) => {
    return new Promise((r,rr) => {
        self.get(url).then((c) => {
            var ctx = ctxTemplate;

            vm.runInNewContext(
                c, 
                ctx
            );
            if(myG !== null) {
                self.globalize(ctx, myG);
            }         
            r(ctx);  
        });
    });
}


self.cobase = cobase;

self.cmd = (commandString, opts) => {
    if(!opts) {
        opts = {};
    }
    if(commandString && commandString.constructor == String) {
        var arrayified = splitCommandString(commandString);
        var first = arrayified.shift();
   
        try {
            var malach = spawn(first, arrayified);
            malach.stderr.on("data", (data) => {
                (opts.onData || empty)(data.toString());
            });
            malach.stdout.on("error", (err) => {
                (opts.onError || empty)(err.toString());
            });

            malach.on("exit", (ec) => {
                (opts.onExit || empty)("just finished with code: " + ec);
            });
        } catch(e) {
            (opts.onFail || empty)({
                message:"failed with this command string: " + commandString + "and this is the first argument" + first + "and this is the rest" + JSON.stringify(arrayified),
                failure:e
            });
        }

    }

};


self.adanServer = (opts) => {
    if(adan) {
		new adan.AdanServer(opts);
	}
};

module.exports = self;

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

function includePossibleScripts() {
    try {
        babel = require("@babel/core");
    } catch(E) {
        console.log(E);
    }
}