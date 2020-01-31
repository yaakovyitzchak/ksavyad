var fs = require("fs"),
	http = require("http"),
	{PNG} = require("pngjs"),
	stream = require("stream");
	/*
http.createServer((q,r) => {
	fs.readFile("a.jpg", (er, d) => {
		console.log(d, d[0], d[0].toString());
		/*var ar = []
		for(var i = 0; i < d.length; i++) {
			ar.push(d[i].toString())
		}
		console.log(ar
		var ar = new Uint32Array(d);
		console.log(ar[5842], String.fromCharCode(ar[5842]))
	//	ar[5842] = 20
		for(var i = 400; i < 5842; i++)
			ar[i] = 20
		console.log(ar);
		var buf = Buffer.from(ar);
		fs.writeFileSync("hi.txt", 
			Array.apply(0,ar)
			.map(x=> String.fromCharCode(x)).toString());
		r.end(buf);
	});
}).listen(990);*/
function lanczosCreate(lobes) {
    return function(x) {
        if (x > lobes)
            return 0;
        x *= Math.PI;
        if (Math.abs(x) < 1e-16)
            return 1;
        var xx = x / lobes;
        return Math.sin(x) * Math.sin(xx) / x / xx;
    };
}

// elem: canvas element, img: image element, sx: scaled width, lobes: kernel radius


function thumbnailer(png, sx, lobes, callback) {

    
    this.dest = {
        width : sx,
        height : Math.round(png.height * sx / png.width),
    };
    this.dest.data = new Array(this.dest.width * this.dest.height * 4);
    this.lanczos = lanczosCreate(lobes);
    this.ratio = png.width / sx;
    this.rcp_ratio = 2 / this.ratio;
    this.range2 = Math.ceil(this.ratio * lobes / 2);
    this.cacheLanc = {};
    this.center = {};
    this.icenter = {};
	this.callback = callback;
	this.png = png;
	console.log(this.process1)
    setTimeout(this.process1, 0, this, 0);
}


thumbnailer.prototype.process1 = function(self, u) {
    self.center.x = (u + 0.5) * self.ratio;
    self.icenter.x = Math.floor(self.center.x);
    for (var v = 0; v < self.dest.height; v++) {
        self.center.y = (v + 0.5) * self.ratio;
        self.icenter.y = Math.floor(self.center.y);
        var a, r, g, b;
        a = r = g = b = 0;
        for (var i = self.icenter.x - self.range2; i <= self.icenter.x + self.range2; i++) {
            if (i < 0 || i >= self.png.width)
                continue;
            var f_x = Math.floor(1000 * Math.abs(i - self.center.x));
            if (!self.cacheLanc[f_x])
                self.cacheLanc[f_x] = {};
            for (var j = self.icenter.y - self.range2; j <= self.icenter.y + self.range2; j++) {
                if (j < 0 || j >= self.png.height)
                    continue;
                var f_y = Math.floor(1000 * Math.abs(j - self.center.y));
                if (self.cacheLanc[f_x][f_y] == undefined)
                    self.cacheLanc[f_x][f_y] = self.lanczos(Math.sqrt(Math.pow(f_x * self.rcp_ratio, 2)
                            + Math.pow(f_y * self.rcp_ratio, 2)) / 1000);
                weight = self.cacheLanc[f_x][f_y];
                if (weight > 0) {
                    var idx = (j * self.png.width + i) * 4;
                    a += weight * self.png.data[idx + 3];
                    r += weight * self.png.data[idx];
                    g += weight * self.png.data[idx + 1];
                    b += weight * self.png.data[idx + 2];
                }
            }
        }
        var idx = (v * self.dest.width + u) * 4;
        self.dest.data[idx] = r;
        self.dest.data[idx + 1] = g;
        self.dest.data[idx + 2] = b;
        self.dest.data[idx + 3] = a;
    }

    if (++u < self.dest.width)
        setTimeout(self.process1, 0, self, u);
    else
        setTimeout(self.process2, 0, self);
};
thumbnailer.prototype.process2 = function(self) {
 
    self.src = new PNG({
		width:self.dest.width,
		height:self.dest.height,
		filterType:-1
	});
    var idx, idx2;
    for (var i = 0; i < self.dest.width; i++) {
        for (var j = 0; j < self.dest.height; j++) {
            idx = (j * self.dest.width + i) * 3;
            idx2 = (i * self.dest.width + j) * 4;
            self.src.data[idx2] = self.dest.data[idx2];
            self.src.data[idx2 + 1] = self.dest.data[idx2 + 1];
            self.src.data[idx2 + 2] = self.dest.data[idx2 + 2];
            self.src.data[idx2 + 3] = self.dest.data[idx2 + 3];
        }
    }
	self.callback(self.src)
};
/*
fs.createReadStream('in.png')
    .pipe(new PNG({
        filterType: 4
    }))
    .on('parsed', function() {
		
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                var idx = (this.width * y + x) << 2;

                // invert color
                this.data[idx] = 255 - this.data[idx];
                this.data[idx+1] = 255 - this.data[idx+1];
                this.data[idx+2] = 255 - this.data[idx+2];

                // and reduce opacity
                this.data[idx+3] = this.data[idx+3] >> 1;
            }
        }

        this.pack().pipe(fs.createWriteStream('out.png'));
    });*/
	var p = new PNG({
		width:200,
		height:200,
		
		filterType:-1
	});
	for(var y = 0; y < p.height; y++) {
		for(var x = 0; x < p.width; x++) {
			var idx = (p.width * y + x) << 2;
			p.data[idx] = Math.floor(Math.random(0, 255) * 255);
			p.data[idx + 1] = Math.floor(Math.random(0, 255) * 255);
			p.data[idx + 2] = Math.floor(Math.random(0, 255) * 255);
			p.data[idx + 3] = Math.floor(Math.random(0, 255) * 255);
		}
	}
	var o = fs.readFileSync("./ina.png");
	//console.log(b2s(o));
	//fs.createReadStream('ina.png')
	
	cobRes(o, b=>fs.writeFileSync("00000LALA", b))
	function cobRes(iBuf, width, cb) {
		b2s(o)
		.pipe(new PNG({
			filterType: -1
		}))
		.on('parsed', function() {
			
			var nw = width;
			var nh = nw *  this.height /this.width;
			var f = resize(this, nw, nh);
			
			sbuff(f.pack(), b=>{
				console.log(b);
				cb(b);
			})
		})
		
		
		function resize(srcPng, width, height) {
			var rez = new PNG({
				width:width,
				height:height
			});
			for(var i = 0; i < width; i++) {
				var tx = i / width,
					ssx = Math.floor(tx * srcPng.width);
				for(var j = 0; j < height; j++) {
					var ty = j / height,
						ssy = Math.floor(ty * srcPng.height);
					var indexO = (ssx + srcPng.width * ssy) * 4,
						indexC = (i + width * j) * 4,
						rgbaO = [
							srcPng.data[indexO  ],
							srcPng.data[indexO+1],
							srcPng.data[indexO+2],
							srcPng.data[indexO+3]
						]
					rez.data[indexC  ] = rgbaO[0];
					rez.data[indexC+1] = rgbaO[1];
					rez.data[indexC+2] = rgbaO[2];
					rez.data[indexC+3] = rgbaO[3];
				}
			}
			return rez;
		}
		
		function b2s(b) {
			var str = new stream.Readable();
			str.push(b);
			str.push(null);
			return str;
		}
		function sbuff(stream, cb) {
			var bufs = []
			var pk = stream;
			pk.on('data', (d)=> {
				bufs.push(d);
				
			})
			pk.on('end', () => {
				var buff = Buffer.concat(bufs);
				cb(buff);
			});
		}
	}
	
	
	//	f.pack().pipe(fs.createWriteStream('00011SASDut.png'));
	
		/*new thumbnailer(this, 200, 3, d => {
			console.log("OK");
			sbuff(d, b => {
				fs.writeFileSync("00aaaa.png", b);
			})
		});
		
		/*/
	/*
sbuff(p, (b) => {
			fs.writeFileSync("11OWthere.png", b);
			console.log(234)
		})
		
	*/
	/*
		for(var x = 0; x < width; x++) {
			for(var y = 0; y < height; y++) {
				var ix = (y + height * x) * 4;
				rez.data[ix] = srcPng.data[ix];
				rez.data[ix+1] = srcPng.data[ix+1];
				rez.data[ix+2] = srcPng.data[ix+2];
				rez.data[ix+3] = srcPng.data[ix+3];
			}
		}/*
		for(var i = 0; i < srcPng.data.length; i++) {
			rez.data[i] = srcPng.data[i];
		}*/
	
	//p.pack().pipe(fs.createWriteStream("OK.png"));
console.log(2)