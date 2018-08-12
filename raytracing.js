﻿'use strict';

class Color {
	constructor(r = 0, g = 0, b = 0){
		this.r = r;
		this.g = g;
		this.b = b;
	}
	
	check(){
		this.r = (this.r > 255) ? 255 : (this.r < 0) ? 0 : this.r;
		this.g = (this.g > 255) ? 255 : (this.g < 0) ? 0 : this.g;
		this.b = (this.b > 255) ? 255 : (this.b < 0) ? 0 : this.b;
	}
	
	multiply(k) {
		return new Color(
			this.r * k,
			this.g * k,
			this.b * k
		);
	}
	
	multiplyVector(vector) {
		return new Color(
			this.r * vector.v1,
			this.g * vector.v2,
			this.b * vector.v3
		);
	}
}

class Vector {
	constructor(v1 = 0, v2 = 0, v3 = 0){
		this.v1 = v1;
		this.v2 = v2;
		this.v3 = v3;
	}
	
	static dotProduct(vector1, vector2){
		// скалярное произведение
		return vector1.v1 * vector2.v1 + vector1.v2 * vector2.v2 + vector1.v3 * vector2.v3;	
	}
	
	static multiply(vector, k) {
		// умножение на число
		return new Vector(
			vector.v1 * k,
			vector.v2 * k,
			vector.v3 * k
		);
	}
	
	static divide(vector, k) {
		// деление на число
		return new Vector(
			vector.v1 / k,
			vector.v2 / k,
			vector.v3 / k
		);
	}
	
	static add(vector1, vector2) {
		// сложение
		return new Vector(
			vector1.v1 + vector2.v1,
			vector1.v2 + vector2.v2,
			vector1.v3 + vector2.v3
		);
	}

	static subtract(vector1, vector2) {
		// вычитание
		return new Vector(
			vector1.v1 - vector2.v1,
			vector1.v2 - vector2.v2,
			vector1.v3 - vector2.v3
		);
	}
	
	length(){
		// длина вектора
		return Math.sqrt(Vector.dotProduct(this, this));
	}
}

class Camera {
	constructor(x = 0, y = 0, z = 0){
		this.x = x;
		this.y = y;
		this.z = z;
		//this.viewportWidth = document.documentElement.clientWidth / document.documentElement.clientHeight;
		this.viewportWidth = 1;
		this.viewportHeight = 1;
		this.distanse = 1;
	}
}

class Sphere {
	constructor(x = 0, y = 0, z = 0, radius = 1, color = new Color(), specularity = 0){
		this.x = x;
		this.y = y;
		this.z = z;
		this.radius = radius;
		this.color = color;
		this.specularity = specularity;
	}
}

class LightAmbient {
	constructor(intensity = new Vector(1, 1, 1)){
		this.intensity = intensity;
	}
}

class LightPoint {
	constructor(x = 0, y = 0, z = 0, intensity = new Vector(1, 1, 1)){
		this.x = x;
		this.y = y;
		this.z = z;
		this.intensity = intensity;
	}
}

class LightDirectional {
	constructor(intensity = new Vector(1, 1, 1), direction = new Vector(0, 0, 0)){
		this.intensity = intensity;
		this.direction = direction;
	}
}

class Renderer {
	constructor(canvas){
		this.camera = new Camera(0, 0, 0);
		this.canvas = canvas;
		
		this.canvasContext = this.canvas.getContext('2d');
		this.canvasBuffer = this.canvasContext.getImageData(0, 0, this.canvas.width, this.canvas.height);
		this.canvasPitch = this.canvasBuffer.width * 4;
		this.backgroundColor = new Color(0, 0, 0);
		
		this.scene = {};
		
		this.scene.sphere = {};
		this.scene.sphere.a = new Sphere(0, 0, 5, 1, new Color(255, 255, 255), 100);
		//this.scene.sphere.b = new Sphere(-2, 0, 5, 1, new Color(0, 255, 0), 100);
		//this.scene.sphere.c = new Sphere(2, 0, 5, 1, new Color(0, 0, 255), 100);
		this.scene.sphere.d = new Sphere(0, -5001, 0, 5000, new Color(255, 255, 255));
		
		this.scene.light = {};
		this.scene.light.a = new LightAmbient(new Vector(0.1, 0.1, 0.1));
		//this.scene.light.b = new LightDirectional(new Vector(0.3, 0.3, 0.3), new Vector(1, 4, 4));
		this.scene.light.c = new LightPoint(2, 3, 8, new Vector(0, 0.6, 0));
		this.scene.light.d = new LightPoint(-2, 3, 8, new Vector(0, 0, 0.6));
		//this.scene.light.f = new LightPoint(0, 4, 2, new Vector(0.9, 0, 0));
		
		this.rayCount = 0;
		this.quality = 1;
		this.epsilon = 1e-3;
		
		this.canvasContext.putPixel = (x, y, color) => {
			if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
				return;
			}

			var offset = 4 * x + this.canvasPitch * y;
			this.canvasBuffer.data[offset++] = color.r;
			this.canvasBuffer.data[offset++] = color.g;
			this.canvasBuffer.data[offset++] = color.b;
			this.canvasBuffer.data[offset] = 255; // Alpha = 255 (полная не прозрачность)
			this.rayCount++;
		};
		
		this.draw();
	}
	
	canvasToViewport(canvasX, canvasY){
		return new Vector(
			(canvasX - this.canvas.width / 2) * this.camera.viewportWidth / this.canvas.width,
			-(canvasY - this.canvas.height / 2) * this.camera.viewportHeight / this.canvas.height,
			this.camera.distanse,
		);
	}
	
	traceRay(origin, direction, tMin, tMax) {
		var intersection = this.closestIntersection(origin, direction, tMin, tMax);
		var closestSphere = intersection.closestSphere;
		var closestT = intersection.closestT;
		
		if(!closestSphere){
			return this.backgroundColor;
		}
		
		var point = new Vector(
			origin.x + closestT * direction.v1,
			origin.y + closestT * direction.v2,
			origin.z + closestT * direction.v3
		);
		var normal = new Vector(
			point.v1 - closestSphere.x,
			point.v2 - closestSphere.y,
			point.v3 - closestSphere.z
		);
		normal = Vector.divide(normal, normal.length());
		
		var view = Vector.multiply(direction, -1);
		var lighting = this.computeLighting(point, normal, view, closestSphere.specularity);
		
		return closestSphere.color.multiplyVector(lighting);
	}
	
	closestIntersection(origin, direction, tMin, tMax) {
		var closestT = Infinity;
		var closestSphere = null;
		for(let x in this.scene.sphere){
			var tmp = this.intersectRaySphere(origin, direction, this.scene.sphere[x]);
			if(tmp.t1 > tMin && tmp.t1 < tMax && tmp.t1 < closestT){
				closestT = tmp.t1;
				closestSphere = this.scene.sphere[x];
			}
			if(tmp.t2 > tMin && tmp.t2 < tMax && tmp.t2 < closestT){
				closestT = tmp.t2
				closestSphere = this.scene.sphere[x];
			}
		}
		return {closestSphere: closestSphere, closestT: closestT};
	}
	
	intersectRaySphere(origin, direction, sphere) {
		var radius = sphere.radius;
		if(origin instanceof Vector){
			var vector = new Vector(
				origin.v1 - sphere.x,
				origin.v2 - sphere.y,
				origin.v3 - sphere.z,
			);
		}
		else {
			var vector = new Vector(
				origin.x - sphere.x,
				origin.y - sphere.y,
				origin.z - sphere.z,
			);
		}
		
		var a = Vector.dotProduct(direction, direction);
		var b = 2 * Vector.dotProduct(vector, direction);
		var c = Vector.dotProduct(vector, vector) - radius * radius;
		
		var discriminant = b * b - 4 * a * c;
		if(discriminant < 0){
			return {
				t1: Infinity,
				t2: Infinity
			};
		}

		var t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
		var t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
		return {
			t1: t1,
			t2: t2
		};
	}
	
	computeLighting(point, normal, view, specularity){
		var intensity = new Vector(0, 0, 0);
		for(let x in this.scene.light){
			if(this.scene.light[x] instanceof LightAmbient){
				intensity = Vector.add(intensity, this.scene.light[x].intensity);
			} else {
				var L, tMax;
				if(this.scene.light[x] instanceof LightPoint){
					L = new Vector(
						this.scene.light[x].x - point.v1,
						this.scene.light[x].y - point.v2,
						this.scene.light[x].z - point.v3,
					);
					tMax = 1;
				}
				if(this.scene.light[x] instanceof LightDirectional){
					L = this.scene.light[x].direction;
					tMax = Infinity;
				}
				// Тени
				var blocker = this.closestIntersection(point, L, this.epsilon, tMax);
				if (blocker.closestSphere) {
					continue;
				}
				// Диффузность
				var a = Vector.dotProduct(normal, L);
				if(a > 0){
					intensity = Vector.add(intensity, new Vector(
						this.scene.light[x].intensity.v1 * a / (normal.length() * L.length()),
						this.scene.light[x].intensity.v2 * a / (normal.length() * L.length()),
						this.scene.light[x].intensity.v3 * a / (normal.length() * L.length()),
					));
				}
				// Зеркальность
				if (specularity != -1) {
					var R = Vector.subtract(Vector.multiply(normal, 2 * Vector.dotProduct(L, normal)), L);
					var RDotV = Vector.dotProduct(R, view);
					if (RDotV > 0) {
						var tmp = Math.pow(RDotV / (R.length() * view.length()), specularity);
						intensity = Vector.add(intensity, new Vector(
							this.scene.light[x].intensity.v1 * tmp,
							this.scene.light[x].intensity.v2 * tmp,
							this.scene.light[x].intensity.v3 * tmp,
						));
					}
				}
				
			}
		}
		return intensity;
	}
	
	updateCanvas(){
		this.canvasContext.putImageData(this.canvasBuffer, 0, 0);
	}
	
	draw() {
		console.time('bench');
		for(let x = 0; x < this.canvas.width; x += this.quality){
			for(let y = 0; y < this.canvas.height; y += this.quality){
				var direction = this.canvasToViewport(x, y);
				var color = this.traceRay(this.camera, direction, this.camera.distanse, Infinity);
				this.canvasContext.putPixel(x, y, color);
			}
		}
		this.updateCanvas();
		console.timeEnd('bench');
		console.log(this.rayCount, 'rays');
	}
}

const canvas = document.getElementById('canvas');
canvas.width = 700;
canvas.height = 700;
//canvas.width = document.documentElement.clientWidth;
//canvas.height = document.documentElement.clientHeight;
const raytracing = new Renderer(canvas);
