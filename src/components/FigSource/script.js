import introJs from 'intro.js';
import * as color from "../../utils/color.js";
import { offset } from "../../utils/common-utils.js";
import { decompose } from "../../algorithm/decompose.js";
import { compose, findGroup } from "../../algorithm/compose.js";
import color_space_divide from "../../algorithm/color-space-divide.js";
import { systematic_sampling_seq } from "../../algorithm/sampling.js";
import { interactionInit } from "../../interaction/interaction.js"
import { Canvas, Item } from "../../canvas/canvas-object.js";
import * as d3 from "d3";
import { mapState} from 'vuex';

let ngroup, groups, maxtimestamp, currenttime, lastgroup, tags;
let initalData, currentData, color_spaces = [], img;
let zoom_ratio, bgtag;

export default {
   data() {
		const blocks = ['overview', '1', '2', '3'].map(d => ({
				name: d,
				selectedItems: [],
			}))
		return {
            blocks: blocks,
			activeBlock: blocks[0],
			canvas: null,
			editor: null,
		};
    },
	props: ['src', 'width', 'height'],
    computed:{
        ...mapState({
            temps:'temps',
            blocksTrue: 'blocks',
        })
    },
	methods: {
        deleteTab() {
            const index=this.blocks.indexOf(this.activeBlock);
            this.blocks.splice(index,1);
            this.blocksTrue.splice(index, 1);
        },
        addTab(){
            const item = {};
            // item.name = this.blocks.length.toString();
            item.name="new";
            item.selectedItems = [];
            this.blocks.push(item);
        },
        addBlock(temp) {
            this.blocksTrue.push(temp);
            this.activeBlock.name=temp.name;
            // this.blocks.forEach((blk)=>{
            //     if(blk.name==this.activeBlock.name)
            //      blk.name = temp.name;
            // })
        },
		figure_tabs_class(item) {
			return {
				"figure-tabs_item": true,
				"active": item == this.activeBlock
			};
		},
		createsvgFromGroup(group0) {
			const canvas = this.$el.getElementsByTagName('canvas')[0];
			const top = [], btm = [];
			const contour = [];
			const width = canvas.width;
			const height = canvas.height;

			let n = 0, r = 0, g = 0, b = 0, x0 = Number.MAX_VALUE, y0 = Number.MAX_VALUE, x1 = 0, y1 = 0;
			for (const group of groups) {
				if (findGroup(group, currenttime) === group0) {
					const points = group.points;
					for (let i = 0; i < points.length; i += 2) {
						const x = Math.floor(points[i] / zoom_ratio);
						const y = points[i + 1] / zoom_ratio;
						n += 1;
						r += currentData.data[((points[i + 1] * width + points[i]) << 2) + 0];
						g += currentData.data[((points[i + 1] * width + points[i]) << 2) + 1];
						b += currentData.data[((points[i + 1] * width + points[i]) << 2) + 2];
						if (!btm[x]) {
							btm[x] = y;
						} else if (y > btm[x]) {
							btm[x] = y;
						}
						if (!top[x]) {
							top[x] = y;
						} else if (y < top[x]) {
							top[x] = y;
						}
						if (x < x0) {
							x0 = x;
						} else if (x > x1) {
							x1 = x;
						}
						if (y < y0) {
							y0 = y;
						} else if (y > y1) {
							y1 = y;
						}
					}
				}
			}
			if (n === 0) return;
			r = Math.floor(r / n);
			g = Math.floor(g / n);
			b = Math.floor(b / n);

			for (var i = 0; i < top.length; ++i) if (top[i] !== undefined) {
				contour.push([i, top[i]]);
			}
			for (var i = btm.length - 1; i >= 0; --i) if (btm[i] !== undefined) {
				contour.push([i, btm[i]]);
			}
			contour.push(contour[0]);
			const line = d3.line().curve(d3.curveCardinal.tension(0.5)).x(d => d[0] - x0).y(d => d[1] - y0);
			const contour_sample =
				contour.length < 100 ?
				contour :
				contour.filter((d, i) => i === 0 || i === (contour.length - 1) || (i % 2 === 0));

			const div = d3.select(this.$el)
				.append("div")
				.attr("draggable", true)
				.attr("id", "canvas-dragged-item")
				.on("dragstart", ondragstart)
				.on("dragend", ondragend);

			const svg = div
				.append("svg");

			let left0 = -1, top0 = -1;

			svg.attr("width", x1 - x0)
				.attr("height", y1 - y0);

			svg.append("path")
				.datum(contour_sample)
				.attr('d', line)
				.attr("stroke-width", 2)
				.attr("fill", `rgb(${r},${g},${b})`);

			console.info(offset.x(canvas), offset.y(canvas));
			div.attr('x', x0)
				.attr('y', y0)
				.attr('width', canvas.width / zoom_ratio)
				.attr('height', canvas.height / zoom_ratio)
				.style("z-index", 1)
				.style("position", "fixed")
				.style("left", `${x0 + offset.x(canvas)}px`)
				.style("top", `${y0 + offset.y(canvas)}px`)
				.style("opacity", 1);
		},
		editorRender(event) {
			const canvas = this.$el.getElementsByTagName('canvas')[0];
			const canvas2 = document.getElementsByClassName('editorCanvas')[0];
			const ctx = canvas2.getContext('2d');
			canvas2.width  = canvas.width;
			canvas2.height = canvas.height;
			if (this.editor === null) {
				this.editor = new Canvas(canvas2);
			}

			if (this.activeBlock.name === 'overview') {
				ctx.globalAlpha = 1;
				ctx.drawImage(img, 0, 0);
				return;
			} else {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.globalAlpha = 0.1;
				ctx.drawImage(img, 0, 0);
				ctx.globalAlpha = 1;
			}

			for (const item of this.activeBlock.selectedItems) {
				if (this.editor.Items.indexOf(item) === -1) {
					this.editor.Items.push(item);
					item.a = 0;
				}
			}
			this.editor.animation(0);
		},
		canvasRender(event) {
			const canvas = this.$el.getElementsByTagName('canvas')[0];
			const ctx = canvas.getContext('2d');
			if (this.canvas === null) {
				this.canvas = new Canvas(canvas);
			}

			if (this.activeBlock.name === 'overview') {
				ctx.globalAlpha = 1;
				ctx.drawImage(img, 0, 0);
				return;
			} else {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.globalAlpha = 0.1;
				ctx.drawImage(img, 0, 0);
				ctx.globalAlpha = 1;
			}

			for (const item of this.activeBlock.selectedItems) {
				item.render(this.canvas);
			}
		},
		onRightClick(event) {
			const canvas = this.$el.getElementsByTagName('canvas')[0];
			const ctx = canvas.getContext('2d');
			const x = Math.floor((event.pageX - offset.x(canvas)) * zoom_ratio);
			const y = Math.floor((event.pageY - offset.y(canvas)) * zoom_ratio);
			let group0 = ngroup[y * canvas.width + x];
			if (group0 != null) {
				group0 = findGroup(group0, currenttime);
				const i = this.activeBlock.selectedItems.indexOf(group0.item);
				if (i != -1) {
					this.activeBlock.selectedItems.splice(i, 1);
					this.canvasRender(event);
				}
			}
		},
		onClick(event) {
			const start_time = new Date();
			const canvas = this.$el.getElementsByTagName('canvas')[0];
			const ctx = canvas.getContext('2d');
			const x = Math.floor((event.pageX - offset.x(canvas)) * zoom_ratio);
			const y = Math.floor((event.pageY - offset.y(canvas)) * zoom_ratio);
			if (tags[y * canvas.width + x] === bgtag) {
				return;
			}
			console.log(event, event.shiftKey, event.ctrlKey, event.altKey);

			if (event.shiftKey && !event.ctrlKey && !event.altKey) {
				let group0 = ngroup[y * canvas.width + x];
				if (group0 != null) {
					group0 = findGroup(group0, currenttime);
					this.activeBlock.selectedItems.push(group0.item);
					this.canvasRender(event);
				}
			}
			else if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
				let group0 = ngroup[y * canvas.width + x];
				if (group0 != null) {
					group0 = findGroup(group0, currenttime);
					this.activeBlock.selectedItems.push(group0.item);
					for (const group of groups) {
						if (group.points.length > 10 &&
							//group.tag === group0.tag &&
							Math.abs(group.color[0] - group0.color[0]) < 0.02 &&
							Math.abs(group.color[1] - group0.color[1]) < 0.5 &&
							Math.abs(group.color[2] - group0.color[2]) < 0.5
							) {
							this.activeBlock.selectedItems.push(group.item);
						}
					}
					this.canvasRender(event);
				}
			} else if (event.shiftKey && !event.ctrlKey && event.altKey) {
				let group0 = ngroup[y * canvas.width + x];
				if (group0 != null) {
					group0 = findGroup(group0, currenttime);
					this.activeBlock.selectedItems.push(group0.item);
					for (const group of groups) {
						if (group.tag === group0.tag && group.points.length > 10) {
							this.createsvgFromGroup(group);
						}
					}
					this.canvasRender(event);
				}
			} else if (event.altKey && !event.shiftKey && !event.ctrlKey) {
				console.log('convert to svg');
				let group0 = ngroup[y * canvas.width + x];
				const top = [], btm = [];
				const contour = [];

				if (group0 != null) {
					group0 = findGroup(group0, currenttime);
					const width = canvas.width;
					const height = canvas.height;

					let n = 0, r = 0, g = 0, b = 0, x0 = Number.MAX_VALUE, y0 = Number.MAX_VALUE, x1 = 0, y1 = 0;
					for (const group of groups) {
						if (findGroup(group, currenttime) === group0) {
							const points = group.points;
							for (let i = 0; i < points.length; i += 2) {
								const x = Math.floor(points[i] / zoom_ratio);
								const y = points[i + 1] / zoom_ratio;
								n += 1;
								r += currentData.data[((points[i + 1] * width + points[i]) << 2) + 0];
								g += currentData.data[((points[i + 1] * width + points[i]) << 2) + 1];
								b += currentData.data[((points[i + 1] * width + points[i]) << 2) + 2];
								if (!btm[x]) {
									btm[x] = y;
								} else if (y > btm[x]) {
									btm[x] = y;
								}
								if (!top[x]) {
									top[x] = y;
								} else if (y < top[x]) {
									top[x] = y;
								}
								if (x < x0) {
									x0 = x;
								} else if (x > x1) {
									x1 = x;
								}
								if (y < y0) {
									y0 = y;
								} else if (y > y1) {
									y1 = y;
								}
							}
						}
					}
					r = Math.floor(r / n);
					g = Math.floor(g / n);
					b = Math.floor(b / n);

					for (var i = 0; i < top.length; ++i) if (top[i] !== undefined) {
						contour.push([i, top[i]]);
					}
					for (var i = btm.length - 1; i >= 0; --i) if (btm[i] !== undefined) {
						contour.push([i, btm[i]]);
					}
					contour.push(contour[0]);
					const line = d3.line().curve(d3.curveCardinal.tension(0.5)).x(d => d[0] - x0).y(d => d[1] - y0);
					const contour_sample =
						contour.length < 100 ?
						contour :
						contour.filter((d, i) => i === 0 || i === (contour.length - 1) || (i % 4 === 0));

					const div = d3.select(this.$el)
						.append("div")
						.attr("draggable", true)
						.attr("id", "canvas-dragged-item")
						.on("dragstart", ondragstart)
						.on("dragend", ondragend);

					const svg = div
						.append("svg");

					let left0 = -1, top0 = -1;

					svg.attr("width", x1 - x0)
						.attr("height", y1 - y0);

					svg.append("path")
						.datum(contour_sample)
						.attr('d', line)
						.attr("stroke-width", 2)
						.attr("fill", `rgb(${r},${g},${b})`);

					console.info(offset.x(canvas), offset.y(canvas));
					div.attr('x', x0)
						.attr('y', y0)
						.attr('width', canvas.width / zoom_ratio)
						.attr('height', canvas.height / zoom_ratio)
						.style("z-index", 1)
						.style("position", "fixed")
						.style("left", `${x0 + offset.x(canvas)}px`)
						.style("top", `${y0 + offset.y(canvas)}px`)
						.style("opacity", 1);
				}
				console.info(`click time used: ${(new Date()).getTime() - start_time.getTime()} ms`);
			}
			this.editorRender(event);
		},
		onMousemove(event) {
			const start_time = new Date();
			const canvas = this.$el.getElementsByTagName('canvas')[0];
			const ctx = canvas.getContext('2d');
			const x = Math.floor((event.pageX - offset.x(canvas)) * zoom_ratio);
			const y = Math.floor((event.pageY - offset.y(canvas)) * zoom_ratio);
			if (tags[y * canvas.width + x] === bgtag) {
				return;
			}

			let group0 = ngroup[y * canvas.width + x];
			if (group0 != null) {
				group0 = findGroup(group0, currenttime);
				this.activeBlock.selectedItems.push(group0.item);
				this.canvasRender(event);
				this.activeBlock.selectedItems.pop();
			}

			console.info(x, y, event, `time used: ${(new Date()).getTime() - start_time.getTime()} ms`);
		},
		onTabClick(item) {
			this.activeBlock = item;
			this.canvasRender();
		},
		onButtonMouseenter(event) {
			const tag = ~~event.target.getAttribute("tag");
			const canvas = this.$el.getElementsByTagName('canvas')[0];
			const ctx = canvas.getContext('2d');
			const width = canvas.width;
			const height = canvas.height;
			const data = currentData.data;
			let count = 0;
			for (let i = 0; i < width * height; ++i) if (tags[i] === tag) {
				data[(i << 2) + 3] = 255;
				++count;

			} else {
				data[(i << 2) + 3] = 50;
			}
			console.info(tag, count);
			ctx.putImageData(currentData, 0, 0);
		},
		onButtonMouseout(event) {
			const canvas = this.$el.getElementsByTagName('canvas')[0];
			const ctx = canvas.getContext('2d');
			lastgroup = null;
			ctx.putImageData(initalData, 0, 0);
			const width = canvas.width;
			const height = canvas.height;
			const data = currentData.data;
			for (let i = 0; i < width * height; ++i) {
				data[(i << 2) + 3] = 30;
			}
		}
	},

	mounted() {
		const canvas = this.$el.getElementsByTagName('canvas')[0];
		const svg = this.$el.getElementsByTagName('svg')[0];
		const ctx = canvas.getContext('2d');
		img = new Image();
		img.src = this.src;
		img.onload = () => {
			canvas.width = img.width;
			canvas.height = img.height;
			const realWidth = canvas.parentNode.clientWidth;
			const realHeight = canvas.parentNode.clientHeight;
			zoom_ratio = Math.max(img.width / realWidth, img.height / realHeight);
			console.log('image', img.width, img.height);
			console.log('zoom', realWidth, realHeight, zoom_ratio);
			ctx.drawImage(img, 0, 0);
			preprocessing(canvas);
			//svg.attr('width', img.width / zoom_ratio)
			//	.attr('height', img.height / zoom_ratio);
		};
		interactionInit();
	}
};

function preprocessing(canvas) {
	const start_time = new Date();

	const ctx = canvas.getContext('2d');
	const width = canvas.width;
	const height = canvas.height;

	const imgData = ctx.getImageData(0, 0, width, height);
	const data = imgData.data;
	initalData = imgData;
	const hsl_data = new Float32Array(width * height * 3);
	console.info(`time used: ${(new Date()).getTime() - start_time.getTime()} ms`);

	const seq = systematic_sampling_seq(height * width);
	for (let i = 0; i < height * width; ++i) {
		let r = data[(i << 2) + 0];
		let g = data[(i << 2) + 1];
		let b = data[(i << 2) + 2];
		const a = data[(i << 2) + 3];
		if (a !== 255) {
			r = Math.floor(r / 255 * a);
			g = Math.floor(g / 255 * a);
			b = Math.floor(b / 255 * a);
			data[(i << 2) + 0] = r;
			data[(i << 2) + 1] = g;
			data[(i << 2) + 2] = b;
			data[(i << 2) + 3] = 255;
		}
		const hsl = color.rgbToHsl(r, g, b);
		hsl_data[i * 3 + 0] = hsl[0];
		hsl_data[i * 3 + 1] = hsl[1];
		hsl_data[i * 3 + 2] = hsl[2];
	}
	for (let i = 0; i < seq.length; ++i) {
		const t = seq[i] * 3;
		seq[i] = [hsl_data[t], hsl_data[t + 1], hsl_data[t + 2]];
	}
	const division = color_space_divide(seq);
	const color2tag = division.color2tag;
	console.info(division.tagcount);
	const count = [];
	tags = new Uint16Array(width * height);
	for (let i = 0; i < height * width * 3; i += 3) {
		const tag = color2tag([hsl_data[i], hsl_data[i + 1], hsl_data[i + 2]]);
		if (!count[tag]) {
			count[tag] = 0;
		}
		count[tag] += 1;
		tags[i / 3] = tag;
	}
	console.info(count);
	for (let i = 0; i < count.length; ++i) if (count[i] / (width * height) * 100 > 0.1) {
		color_spaces.push({
			text: `${(count[i] / (width * height) * 100).toFixed(2)}%\n
				${i === 0 ? 'background' : division.tag2hsl(i)}`,
			style:{ color: division.tag2rgb(i)},
			count: count[i],
			index: i,
			name: i.toString(),
		});
	}
	color_spaces.sort((a, b) => b.count - a.count);
	bgtag = color_spaces[0].index;
	for (let i = 0; i < height * width; ++i) {
		if (tags[i] === bgtag) {
			hsl_data[i * 3] = -1;
		}
	}

	console.info(`rgbtoHsl: ${(new Date()).getTime() - start_time.getTime()} ms`);
	const decomposed = decompose(hsl_data, width, height);
	console.info(`decompose: ${(new Date()).getTime() - start_time.getTime()} ms`);
	const elements = compose(decomposed.elements, width, height);
	elements.forEach(function(d) {
		d.rgb = color.hslToRgb(d.color[0], d.color[1], d.color[2]);
		d.r = Math.floor(d.rgb[0]);
		d.g = Math.floor(d.rgb[1]);
		d.b = Math.floor(d.rgb[2]);
		d.item = new Item({
			lines: d.lines,
			color: [d.r, d.g, d.b, 1],
		});
	});
	// console.info(`compose: ${(new Date()).getTime() - start_time.getTime()} ms`);
	ngroup = new Array(width * height);
	groups = elements;
	for (const element of elements) {
		const points = element.points;
		for (let i = 0; i < points.length; i += 2) {
			ngroup[points[i] + points[i + 1] * width] = element;
		}
		if (element.timestamp > maxtimestamp) {
			maxtimestamp = element.timestamp;
		}
		element.tag = color2tag(element.color);
	}
	console.log(elements);

	currenttime = maxtimestamp;
	ctx.putImageData(imgData, 0, 0);
	currentData = ctx.getImageData(0, 0, width, height);
	console.info(`total time used: ${(new Date()).getTime() - start_time.getTime()} ms`);
}



function calc(canvas) {
	const start_time = new Date();

	const ctx = canvas.getContext('2d');
	const width = canvas.width;
	const height = canvas.height;

	const imgData = ctx.getImageData(0, 0, width, height);
	const data = imgData.data;
	initalData = imgData;
	const hsl_data = new Float32Array(width * height * 3);
	console.info(`time used: ${(new Date()).getTime() - start_time.getTime()} ms`);

	const seq = systematic_sampling_seq(height * width);
	for (let i = 0; i < height * width; ++i) {
		let r = data[(i << 2) + 0];
		let g = data[(i << 2) + 1];
		let b = data[(i << 2) + 2];
		const a = data[(i << 2) + 3];
		if (a !== 255) {
			r = Math.floor(r / 255 * a);
			g = Math.floor(g / 255 * a);
			b = Math.floor(b / 255 * a);
			data[(i << 2) + 0] = r;
			data[(i << 2) + 1] = g;
			data[(i << 2) + 2] = b;
			data[(i << 2) + 3] = 255;
		}
		const hsl = color.rgbToHsl(r, g, b);
		hsl_data[i * 3 + 0] = hsl[0];
		hsl_data[i * 3 + 1] = hsl[1];
		hsl_data[i * 3 + 2] = hsl[2];
	}
	for (let i = 0; i < seq.length; ++i) {
		const t = seq[i] * 3;
		seq[i] = [hsl_data[t], hsl_data[t + 1], hsl_data[t + 2]];
	}
	const division = color_space_divide(seq);
	const color2tag = division.color2tag;
	console.info(division.tagcount);
	const count = [];
	tags = new Uint16Array(width * height);
	for (let i = 0; i < height * width * 3; i += 3) {
		const tag = color2tag([hsl_data[i], hsl_data[i + 1], hsl_data[i + 2]]);
		if (!count[tag]) {
			count[tag] = 0;
		}
		count[tag] += 1;
		tags[i / 3] = tag;
	}
	console.info(count);
	for (let i = 0; i < count.length; ++i) if (count[i] / (width * height) * 100 > 0.1) {
		color_spaces.push({
			text: `${(count[i] / (width * height) * 100).toFixed(2)}%\n
				${i === 0 ? 'background' : division.tag2hsl(i)}`,
			style:{ color: division.tag2rgb(i)},
			count: count[i],
			index: i,
			name: i.toString(),
		});
	}
	color_spaces.sort((a, b) => b.count - a.count);
	bgtag = color_spaces[0].index;
	for (let i = 0; i < height * width; ++i) {
		if (tags[i] === bgtag) {
			hsl_data[i * 3] = -1;
		}
	}

	console.info(`rgbtoHsl: ${(new Date()).getTime() - start_time.getTime()} ms`);
	const decomposed = decompose(hsl_data, width, height);
	console.info(`decompose: ${(new Date()).getTime() - start_time.getTime()} ms`);
	const elements = compose(decomposed.elements, width, height);
	elements.forEach(function(d) {
		d.rgb = color.hslToRgb(d.color[0], d.color[1], d.color[2]);
		d.r = Math.floor(d.rgb[0]);
		d.g = Math.floor(d.rgb[1]);
		d.b = Math.floor(d.rgb[2]);
	});
	// console.info(`compose: ${(new Date()).getTime() - start_time.getTime()} ms`);
	ngroup = new Array(width * height);
	groups = elements;
	for (const element of elements) {
		const points = element.points;
		for (let i = 0; i < points.length; i += 2) {
			ngroup[points[i] + points[i + 1] * width] = element;
		}
		if (element.timestamp > maxtimestamp) {
			maxtimestamp = element.timestamp;
		}
		element.tag = color2tag(element.color);
	}
	console.log(elements);

	currenttime = maxtimestamp;
	ctx.putImageData(imgData, 0, 0);
	currentData = ctx.getImageData(0, 0, width, height);
	console.info(`total time used: ${(new Date()).getTime() - start_time.getTime()} ms`);
}


function ondragstart() {
	const event = d3.event;
	event.dataTransfer.clearData();
	event.dataTransfer.setData('text', event.target.id);
}

function ondragend() {
    event.preventDefault();
}
