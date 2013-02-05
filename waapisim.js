// Web Audio API Simulator
// Copyright (c) 2013 g200kg
// http://www.g200kg.com/
//         Licensed under The MIT-License
//         http://opensource.org/licenses/MIT

function waapisimSetup() {
	if(typeof(webkitAudioContext)!="undefined")
		return;

	waapisimAudioBuffer=function(len,ch) {
		this.sampleRate=48000;
		this.length=len;
		this.duration=len/this.sampleRate;
		this.numberOfChannels=ch;
		this.buf=new Array();
		for(var i=0;i<ch;++i) {
			this.buf[i]=new Float32Array(len);
			for(var j=0;j<len;++j)
				this.buf[i][j]=0;
		}
		this.getChannelData=function(i) {
			return this.buf[i];
		}
	}
	waapisimBufSize=1024;
	waapisimAudio=new Audio();
	waapisimAudio.mozSetup(2,48000);
	waapisimWrittenpos=0;
	waapisimNodes=new Array();
	waapisimDestination=new Array();
	waapisimOutBuf=new Float32Array(waapisimBufSize*2);
	waapisimDummybuf=new waapisimAudioBuffer(waapisimBufSize,2);
	
	waapisimInterval=function() {
		var curpos=waapisimAudio.mozCurrentSampleOffset();
		var buffered=waapisimWrittenpos-curpos;
		var vl,vr;
		if(buffered<16384) {
			if(waapisimDestination.length>0) {
				var l=waapisimNodes.length;
				for(var i=0;i<l;++i)
					waapisimNodes[i].Process();
				l=waapisimDestination.length;
				for(var i=0;i<l;++i)
					waapisimDestination[i].Process();
				for(var i=0;i<waapisimBufSize;++i) {
					vl=vr=0;
					for(var j=0;j<l;++j) {
						vl+=waapisimDestination[j].node.outbuf.buf[0][i];
						vr+=waapisimDestination[j].node.outbuf.buf[1][i];
					}
					waapisimOutBuf[i*2]=vl;
					waapisimOutBuf[i*2+1]=vr;
				}
				waapisimWrittenpos+=waapisimAudio.mozWriteAudio(waapisimOutBuf);
			}
		}
	}
	setInterval(waapisimInterval,10);
	webkitAudioContext=function() {
		this.destination=new waapisimAudioDestinationNode(this);
		waapisimDestination.push(this.destination);
		this.sampleRate=48000;
		this.currentTime=0;
		this.activeSourceCount=0;
		this.createBuffer=function(ch,rate,len) {
		}
		this.createJavaScriptNode=function(bufsize,inch,outch) {
			return new waapisimScriptProcessor(this,bufsize,inch,outch);
		}
		this.createScriptProcessor=function(bufsize,inch,outch) {
			return new waapisimScriptProcessor(this,bufsize,inch,outch);
		}
		this.createBiquadFilter=function() {
			return new waapisimBiquadFilter(this);
		}
		this.createGainNode=function() {
			return new waapisimGain(this);
		}
		this.createGain=function() {
			return new waapisimGain(this);
		}
		this.createDelayNode=function() {
			return new waapisimDelay(this);
		}
		this.createDelay=function() {
			return new waapisimDelay(this);
		}
		this.createOscillator=function() {
			return new waapisimOscillator(this);
		}
		this.createAnalyser=function() {
			return new waapisimAnalyser(this);
		}
		this.createConvolver=function() {
			return new waapisimConvolver(this);
		}
		this.createDynamicsCompressor=function() {
			return new waapisimDynamicsCompressor(this);
		}
		this.createPanner=function() {
			return new waapisimPanner(this);
		}
		this.createChannelSplitter=function() {
			return new waapisimChannelSplitter(this);
		}
		this.createChannelMerger=function() {
			return new waapisimChannelMerger(this);
		}
		this.createWaveShaper=function() {
			return new wapisimWaveShaper(this);
		}
		this.decodeAudioData=function(audioData,successCallback,errorCallback) {
		}
	}
	waapisimAudioNode=function(size) {
		this.context=null;
		this.bufsize=size;
		this.from=new Array();
		this.connect=function(input) {
			if(typeof(input.node)!="undefined")
				input.node.from.push(this);
			else
				input.from.push(this);
		}
		this.outbuf=new waapisimAudioBuffer(size,2);
		this.inbuf=new waapisimAudioBuffer(size,2);
		this.GetInputBuf=function() {
			var fanin=this.from.length;
			switch(fanin) {
			case 0:
				return waapisimDummybuf;
			case 1:
				return this.from[0].outbuf;
			default:
				var v1,v2;
				for(var i=0;i<waapisimBufSize;++i) {
					v1=v2=0;
					for(var j=0;j<fanin;++j) {
						v1+=this.from[j].outbuf.buf[0][i];
						v2+=this.from[j].outbuf.buf[1][i];
					}
					this.inbuf.buf[0][i]=v1;
					this.inbuf.buf[1][i]=v2;
				}
				return this.inbuf;
			}
		}
	}
	waapisimAudioProcessingEvent=function() {
	}
	waapisimAudioDestinationNode=function(ctx) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=1;
		this.numberOfOutputs=0;
		this.maxNumberOfChannels=2;
		this.numberOfChannels=2;
		this.connect=function(dest) {this.node.connect(dest);}
		this.Process=function() {
			var inbuf=this.node.GetInputBuf();
			this.node.outbuf=inbuf;
		}
	}
	waapisimScriptProcessor=function(ctx,bufsize,inch,outch) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=1;
		this.numberOfOutputs=1;
		if(typeof(inch)=="undefined")
			inch=2;
		if(typeof(outch)=="undefined")
			outch=2;
		this.connect=function(dest) {this.node.connect(dest);}
		this.bufferSize=bufsize;
		this.inbuf=new waapisimAudioBuffer(bufsize,inch);
		this.outbuf=new waapisimAudioBuffer(bufsize,outch);
		this.index=bufsize;
		this.onaudioprocess=null;
		this.Process=function() {
			var inb=this.node.GetInputBuf();
			for(var i=0;i<waapisimBufSize;++i) {
				if(this.index>=this.bufferSize) {
					if(this.onaudioprocess) {
						var ev=new waapisimAudioProcessingEvent();
						ev.node=this;
						ev.inputBuffer=this.inbuf;
						ev.outputBuffer=this.outbuf;
						this.onaudioprocess(ev);
					}
					this.index=0;
				}
				this.inbuf.buf[0][this.index]=inb.buf[0][i];
				if(this.inbuf.numberOfChannels>=2)
					this.inbuf.buf[1][this.index]=inb.buf[1][i];
				this.node.outbuf.buf[0][i]=this.outbuf.buf[0][this.index];
				if(this.outbuf.numberOfChannels>=2)
					this.node.outbuf.buf[1][i]=this.outbuf.buf[1][this.index];
				else
					this.node.outbuf.buf[1][i]=this.outbuf.buf[0][this.index];
				this.index++;
			}
		}
		waapisimNodes.push(this);
	}
	waapisimBiquadFilter=function(ctx) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=1;
		this.numberOfOutputs=1;
		this.connect=function(dest) {this.node.connect(dest);}
		this.type=0;
		this.frequency=new waapisimAudioParam(10,24000,350);
		this.detune=new waapisimAudioParam(-1200,1200,0);
		this.Q=new waapisimAudioParam(0.0001,1000,1);
		this.gain=new waapisimAudioParam(-40,40,0);
		this.a1=this.a2=0;
		this.b0=this.b1=this.b2=0;
		this.x1l=this.x1r=this.x2l=this.x2r=0;
		this.y1l=this.y1r=this.y2l=this.y2r=0;
		this.Setup=function(fil) {
			var f=fil.frequency.Get()*Math.pow(2,fil.detune.Get()/1200);
			var q=fil.Q.Get();
			var alpha;
			var w0=2*Math.PI*f/fil.context.sampleRate;
			var cos=Math.cos(w0);
			switch(fil.type) {
			case 0:
				if(q<0) q=0;
				q=Math.pow(10,q/20);
				alpha=Math.sin(w0)/(2*q);
				var ra0=1/(1+alpha);
				fil.a1=-2*cos*ra0;
				fil.a2=(1-alpha)*ra0;
				fil.b0=fil.b2=(1-cos)/2*ra0;
				fil.b1=(1-cos)*ra0;
				break;
			case 1:
				if(q<0) q=0;
				q=Math.pow(10,q/20);
				alpha=Math.sin(w0)/(2*q);
				var ra0=1/(1+alpha);
				fil.a1=-2*cos*ra0;
				fil.a2=(1-alpha)*ra0;
				fil.b0=fil.b2=(1+cos)/2*ra0;
				fil.b1=-(1+cos)*ra0;
				break;
			case 2:
				if(q<0.001) q=0.001;
				alpha=Math.sin(w0)/(2*q);
				var ra0=1/(1+alpha);
				fil.a1=-2*cos*ra0;
				fil.a2=(1-alpha)*ra0;
				fil.b0=alpha;
				fil.b1=0;
				fil.b2=-alpha;
				break;
			case 3:
				alpha=Math.sin(w0)/2*Math.sqrt(2);
				var g=Math.pow(10,fil.gain.Get()/40);
				var ra0=1/((g+1)+(g-1)*cos+2*Math.sqrt(g)*alpha);
				fil.a1=-2*((g-1)+(g+1)*cos)*ra0;
				fil.a2=((g+1)+(g-1)*cos-2*Math.sqrt(g)*alpha)*ra0;
				fil.b0=g*((g+1)-(g-1)*cos+2*Math.sqrt(g)*alpha)*ra0;
				fil.b1=2*g*((g-1)-(g+1)*cos)*ra0;
				fil.b2=g*((g+1)-(g-1)*cos-2*Math.sqrt(g)*alpha)*ra0;
				break;
			case 4:
				alpha=Math.sin(w0)/2*Math.sqrt(2);
				var g=Math.pow(10,fil.gain.Get()/40);
				var ra0=1/((g+1)-(g-1)*cos+2*Math.sqrt(g)*alpha);
				fil.a1=2*((g-1)-(g+1)*cos)*ra0;
				fil.a2=((g+1)-(g-1)*cos-2*Math.sqrt(g)*alpha)*ra0;
				fil.b0=g*((g+1)+(g-1)*cos+2*Math.sqrt(g)*alpha)*ra0;
				fil.b1=-2*g*((g-1)+(g+1)*cos)*ra0;
				fil.b2=g*((g+1)+(g-1)*cos-2*Math.sqrt(g)*alpha)*ra0;
				break;
			case 5:
				if(q<0.001) q=0.001;
				alpha=Math.sin(w0)/(2*q);
				var g=Math.pow(10,fil.gain.Get()/40);
				var ra0=1/(1+alpha/g);
				fil.a1=-2*cos*ra0;
				fil.a2=(1-alpha/g)*ra0;
				fil.b0=(1+alpha*g)*ra0;
				fil.b1=-2*cos*ra0;
				fil.b2=(1-alpha*g)*ra0;
				break;
			case 6:
				if(q<0.001) q=0.001;
				alpha=Math.sin(w0)/(2*q);
				var ra0=1/(1+alpha);
				fil.a1=-2*cos*ra0;
				fil.a2=(1-alpha)*ra0;
				fil.b0=fil.b2=ra0;
				fil.b1=-2*cos*ra0;
				break;
			case 7:
				if(q<0.001) q=0.001;
				alpha=Math.sin(w0)/(2*q);
				var ra0=1/(1+alpha);
				fil.a1=-2*cos*ra0;
				fil.a2=(1-alpha)*ra0;
				fil.b0=(1-alpha)*ra0;
				fil.b1=-2*cos*ra0;
				fil.b2=(1+alpha)*ra0;
				break;
			}
		}
		this.Process=function() {
			this.Setup(this);
			var xl,xr,yl,yr;
			var inbuf=this.node.GetInputBuf();
			for(var i=0;i<waapisimBufSize;++i) {
				xl=inbuf.buf[0][i];
				xr=inbuf.buf[1][i];
				yl=this.b0*xl+this.b1*this.x1l+this.b2*this.x2l-this.a1*this.y1l-this.a2*this.y2l;
				yr=this.b0*xr+this.b1*this.x1r+this.b2*this.x2r-this.a1*this.y1r-this.a2*this.y2r;
				this.x2l=this.x1l;
				this.x2r=this.x1r;
				this.x1l=xl;
				this.x1r=xr;
				this.y2l=this.y1l;
				this.y2r=this.y1r;
				this.y1l=yl;
				this.y1r=yr;
				this.node.outbuf.buf[0][i]=yl;
				this.node.outbuf.buf[1][i]=yr;
			}
		}
		waapisimNodes.push(this);
	}
	waapisimGain=function(ctx) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=1;
		this.numberOfOutputs=1;
		this.connect=function(dest) {this.node.connect(dest);}
		this.gain=new waapisimAudioParam(0,1,1);
		this.Process=function() {
			var inbuf=this.node.GetInputBuf();
			for(var i=0;i<waapisimBufSize;++i) {
				this.node.outbuf.buf[0][i]=inbuf.buf[0][i]*this.gain.Get();
				this.node.outbuf.buf[1][i]=inbuf.buf[1][i]*this.gain.Get();
			}
		}
		waapisimNodes.push(this);
	}
	waapisimDelay=function(ctx) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=1;
		this.numberOfOutputs=1;
		this.connect=function(dest) {this.node.connect(dest);}
		this.delayTime=new waapisimAudioParam(0,1,0);
		this.bufl=new Float32Array(48000);
		this.bufr=new Float32Array(48000);
		this.index=0;
		this.Process=function() {
			var inbuf=this.node.GetInputBuf();
			var offs=Math.floor(this.delayTime.Get()*this.context.sampleRate);
			if(offs<0)
				offs=0;
			if(offs>this.context.sampleRate)
				offs=this.context.sampleRate;
			for(var i=0;i<waapisimBufSize;++i) {
				var idxr=this.index-offs;
				if(idxr<0)
					idxr+=48000;
				this.node.outbuf.buf[0][i]=this.bufl[idxr];
				this.node.outbuf.buf[1][i]=this.bufr[idxr];
				this.bufl[this.index]=inbuf.buf[0][i];
				this.bufr[this.index]=inbuf.buf[1][i];
				if(++this.index>=48000)
					this.index=0;
			}
		}
		waapisimNodes.push(this);
	}
	waapisimOscillator=function(ctx) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=0;
		this.numberOfOutputs=1;
		this.connect=function(dest) {this.node.connect(dest);}
		this.type=0;
		this.frequency=new waapisimAudioParam(1,20000,440);
		this.detune=new waapisimAudioParam(-1200,1200,0);
		this.playbackState=0;
		this.phase=0;
		this.start=function(w) {
			this.playbackState=2;
		}
		this.noteOn=function(w) {
			this.start(w);
		}
		this.stop=function(w) {
			this.playbackState=0;
		}
		this.noteOff=function(w) {
			this.stop(w);
		}
		this.Process=function() {
			if(this.playbackState!=2) {
				for(var i=0;i<waapisimBufSize;++i)
					this.node.outbuf[i]=0;
				return;
			}
			var f=Math.abs(this.frequency.Get()*Math.pow(2,this.detune.Get()/1200));
			var delta=f/this.context.sampleRate;
			var x1,x2,y,z;
			switch(this.type) {
			case 0:
				x1=0.5; x2=1.5; y=2*Math.PI; z=1/6.78;
				break;
			case 1:
				x1=0.5; x2=1.5; y=100000; z=0;
				break;
			case 2:
				x1=0; x2=2; y=2; z=0;
				break;
			case 3:
				x1=0.5; x2=1.5; y=4; z=0;
				break;
			}
			for(var i=0;i<waapisimBufSize;++i) {
				if((this.phase+=delta)>=1)
					this.phase-=1;
				var t=(Math.min(Math.max(this.phase ,x1-this.phase), x2-this.phase)-0.5)*y;
				var out=t-t*t*t*z;
				if(out>1.0)
					out=1.0;
				if(out<-1.0)
					out=-1.0
				this.node.outbuf.buf[0][i]=this.node.outbuf.buf[1][i]=out;
			}
		}
		waapisimNodes.push(this);
	}
	waapisimAnalyser=function(ctx) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=1;
		this.numberOfOutputs=1;
		this.connect=function(dest) {this.node.connect(dest);}
		this.fftSize=256;
		this.frequencyBinCount=128;
		this.minDecibels=0;
		this.maxDecibels=0;
		this.smoothingTimeConstant=0;
		this.getByteFrequencyData=function(array) {}
		this.getFloatFrequencyData=function(array) {}
		this.getByteTimeDomainData=function(array) {
			for(var l=array.length,i=0;i<l;++i) {
				array[i]=(this.node.outbuf.buf[0][i]+this.node.outbuf.buf[1][i])*64+128;
			}
		}
		this.Process=function() {
			var inbuf=this.node.GetInputBuf();
			for(var i=0;i<waapisimBufSize;++i) {
				this.node.outbuf.buf[0][i]=inbuf.buf[0][i];
				this.node.outbuf.buf[1][i]=inbuf.buf[1][i];
			}
		}
		waapisimNodes.push(this);
	}
	waapisimConvolver=function(ctx) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=1;
		this.numberOfOutputs=1;
		this.connect=function(dest) {this.node.connect(dest);}
		this.buffer=null;
		this.normalize=false;
		this.Process=function() {
			var inbuf=this.node.GetInputBuf();
			for(var i=0;i<waapisimBufSize;++i) {
				this.node.outbuf.buf[0][i]=inbuf.buf[0][i];
				this.node.outbuf.buf[1][i]=inbuf.buf[1][i];
			}
		}
		waapisimNodes.push(this);
	}
	waapisimDynamicsCompressor=function(ctx) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=1;
		this.numberOfOutputs=1;
		this.connect=function(dest) {this.node.connect(dest);}
		this.threshold=new waapisimAudioParam(-100,0,-24);
		this.knee=new waapisimAudioParam(0,40,30);
		this.ratio=new waapisimAudioParam(1,20,12);
		this.reduction=new waapisimAudioParam(-20,0,0);
		this.attack=new waapisimAudioParam(0,1,0.003);
		this.release=new waapisimAudioParam(0,1,0.25);
		this.Process=function() {
			var inbuf=this.node.GetInputBuf();
			for(var i=0;i<waapisimBufSize;++i) {
				this.node.outbuf.buf[0][i]=inbuf.buf[0][i];
				this.node.outbuf.buf[1][i]=inbuf.buf[1][i];
			}
		}
		waapisimNodes.push(this);
	}
	waapisimPanner=function(ctx) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=1;
		this.numberOfOutputs=1;
		this.connect=function(dest) {this.node.connect(dest);}
		this.panningModel=0;
		this.distanceModel=0;
		this.refDistance=1;
		this.maxDistance=10000;
		this.rolloffFactor=1;
		this.coneInnerAngle=360;
		this.coneOuterAngle=360;
		this.coneOuterGain=0;
		this.setPosition=function(x,y,z) {}
		this.setOrientation=function(x,y,z) {}
		this.setVelocity=function(x,y,z) {}
		this.Process=function() {
			var inbuf=this.node.GetInputBuf();
			for(var i=0;i<waapisimBufSize;++i) {
				this.node.outbuf.buf[0][i]=inbuf.buf[0][i];
				this.node.outbuf.buf[0][i]=inbuf.buf[1][i];
			}
		}
		waapisimNodes.push(this);
	}
	waapisimChannelSplitter=function(ctx) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=1;
		this.numberOfOutputs=1;
		this.connect=function(dest) {this.node.connect(dest);}
		this.Process=function() {
			var inbuf=this.node.GetInputBuf();
			for(var i=0;i<waapisimBufSize;++i) {
				this.node.outbuf.buf[0][i]=inbuf.buf[0][i];
				this.node.outbuf.buf[1][i]=inbuf.buf[1][i];
			}
		}
		waapisimNodes.push(this);
	}
	waapisimChannelMerger=function(ctx) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=1;
		this.numberOfOutputs=1;
		this.connect=function(dest) {this.node.connect(dest);}
		this.Process=function() {
			var inbuf=this.node.GetInputBuf();
			for(var i=0;i<waapisimBufSize;++i) {
				this.node.outbuf.buf[0][i]=inbuf.buf[0][i];
				this.node.outbuf.buf[1][i]=inbuf.buf[1][i];
			}
		}
		waapisimNodes.push(this);
	}
	waapisimWaveShaper=function(ctx) {
		this.context=ctx;
		this.node=new waapisimAudioNode(waapisimBufSize);
		this.numberOfInputs=1;
		this.numberOfOutputs=1;
		this.connect=function(dest) {this.node.connect(dest);}
		this.curve=null;
		this.Process=function() {
			var inbuf=this.node.GetInputBuf();
			if(this.curve!=null) {
				var len=this.curve.length-1;
				for(var i=0;i<waapisimBufSize;++i) {
					var xl=Math.max(-1,Math.min(1,inbuf.buf[0][i]));
					var xr=Math.max(-1,Math.min(1,inbuf.buf[0][i]));
					xl=this.curve[((xl+1)*len*0.5)|0];
					xr=this.curve[((xr+1)*len*0.5)|0];
					this.node.outbuf.buf[0][i]=xl;
					this.node.outbuf.buf[1][i]=xr;
				}
			}
			else {
				for(var i=0;i<waapisimBufSize;++i) {
					this.node.outbuf.buf[0][i]=inbuf.buf[0][i];
					this.node.outbuf.buf[1][i]=inbuf.buf[1][i];
				}
			}
		}
		waapisimNodes.push(this);
	}
	waapisimAudioParam=function(min,max,def) {
		this.value=def;
		this.computedValue=def;
		this.minValue=min;
		this.maxValue=max;
		this.defaultValue=def;
		this.from=new Array();
		this.Get=function() {
			this.computedValue=this.value;
			var len=this.from.length;
			for(var i=0;i<len;++i)
				this.computedValue+=this.from[i].outbuf[0];
			return this.computedValue;
		}
	}
}
waapisimSetup();