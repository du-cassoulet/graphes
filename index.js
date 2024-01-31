const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

window.onresize = () => {
	width = canvas.width = window.innerWidth;
	height = canvas.height = window.innerHeight;
};

const ACTIONS = {
	Move: 0,
	AddNode: 1,
	AddEdge: 2,
	Delete: 3,
};

const actions = [];
const undoActions = [];
const selectedNodes = [];
const gridLength = 20;

let action = ACTIONS.Move;
let canvasAction = () => {};
let fromNode = null;
let movingNode = null;
let selectionZone = null;
let mouseX = 0;
let mouseY = 0;
let grid = false;

class Node {
	constructor(x, y, name) {
		this.x = x;
		this.y = y;
		this.name = name;
		this.edges = [];
	}

	addEdge(node) {
		this.edges.push(new Edge(this, node));
	}

	draw(ctx, selected, { radius = 30 }) {
		if (selected) {
			ctx.strokeStyle = "rgb(60, 161, 232)";
			ctx.fillStyle = "rgb(225, 237, 245)";
		} else {
			ctx.strokeStyle = "black";
			ctx.fillStyle = "white";
		}

		ctx.beginPath();

		if (grid) {
			ctx.arc(
				Math.round(this.x / gridLength) * gridLength,
				Math.round(this.y / gridLength) * gridLength,
				radius,
				0,
				2 * Math.PI
			);
		} else {
			ctx.arc(this.x, this.y, radius, 0, 2 * Math.PI);
		}

		ctx.fill();
		ctx.stroke();

		if (selected) {
			ctx.fillStyle = "rgb(60, 161, 232)";
		} else {
			ctx.fillStyle = "black";
		}

		ctx.font = `${Math.round((radius * 2) / 3)}px Arial`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		if (grid) {
			ctx.fillText(
				this.name,
				Math.round(this.x / gridLength) * gridLength,
				Math.round(this.y / gridLength) * gridLength
			);
		} else {
			ctx.fillText(this.name, this.x, this.y);
		}
	}
}

class Edge {
	constructor(from, to) {
		this.from = from;
		this.to = to;
	}

	draw(ctx, { oriented, nodeRadius }) {
		const startX = this.from.x;
		const startY = this.from.y;
		const endX = this.to.x;
		const endY = this.to.y;
		const arrowLength = 10;
		const arrowAngle = 0.5;

		ctx.strokeStyle = "black";

		if (this.from === this.to) {
			ctx.beginPath();
			ctx.arc(
				startX - nodeRadius * 0.75,
				startY - nodeRadius * 0.75,
				nodeRadius * 0.75,
				0,
				2 * Math.PI
			);

			ctx.stroke();

			const angle = Math.PI / 4.5;

			const arrowX1 =
				startX - nodeRadius - arrowLength * Math.cos(angle - arrowAngle);
			const arrowY1 = startY - arrowLength * Math.sin(angle - arrowAngle);

			const arrowX2 =
				startX - nodeRadius - arrowLength * Math.cos(angle + arrowAngle);
			const arrowY2 = startY - arrowLength * Math.sin(angle + arrowAngle);

			ctx.beginPath();
			ctx.moveTo(startX - nodeRadius, startY);
			ctx.lineTo(arrowX1, arrowY1);
			ctx.moveTo(startX - nodeRadius, startY);
			ctx.lineTo(arrowX2, arrowY2);
			ctx.stroke();
		} else {
			const angle = Math.atan2(endY - startY, endX - startX);

			const arrowX = endX - nodeRadius * Math.cos(angle);
			const arrowY = endY - nodeRadius * Math.sin(angle);

			const arrowX1 = arrowX - arrowLength * Math.cos(angle - arrowAngle);
			const arrowY1 = arrowY - arrowLength * Math.sin(angle - arrowAngle);

			const arrowX2 = arrowX - arrowLength * Math.cos(angle + arrowAngle);
			const arrowY2 = arrowY - arrowLength * Math.sin(angle + arrowAngle);

			ctx.beginPath();
			ctx.moveTo(startX, startY);
			ctx.lineTo(endX, endY);
			ctx.stroke();

			if (oriented) {
				ctx.beginPath();
				ctx.moveTo(arrowX, arrowY);
				ctx.lineTo(arrowX1, arrowY1);
				ctx.moveTo(arrowX, arrowY);
				ctx.lineTo(arrowX2, arrowY2);
				ctx.stroke();
			}
		}
	}
}

class Graph {
	nodes = [];
	edges = [];

	constructor({ oriented = false, nodeRadius = 30, useLetters = false }) {
		this.oriented = oriented;
		this.nodeRadius = nodeRadius;
		this.useLetters = useLetters;
	}

	indexToName(index) {
		const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

		if (!this.useLetters) {
			return (index + 1).toString();
		}

		if (index < letters.length) {
			return letters[index];
		}

		return (
			this.indexToName(Math.floor(index / letters.length) - 1) +
			letters[index % letters.length]
		);
	}

	addNode(node) {
		if (!node.name) {
			node.name = this.indexToName(this.nodes.length);
		}

		this.nodes.push(node);
	}

	getNode(x, y) {
		return this.nodes.find(
			(node) =>
				Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2) <= this.nodeRadius
		);
	}

	adaptPos(pos) {
		if (!grid) return pos;
		return Math.round(pos / gridLength) * gridLength;
	}

	link(from, to) {
		const edge = new Edge(from, to);

		this.edges.push(edge);
		from.addEdge(edge);

		if (!this.oriented) {
			to.addEdge(edge);
		}
	}

	draw(ctx, width, height, selectionZone) {
		ctx.clearRect(0, 0, width, height);

		canvasAction(this);

		if (grid) {
			ctx.strokeStyle = "rgba(0, 0, 10, 0.15)";
			ctx.beginPath();

			for (let x = 0; x < width; x += gridLength) {
				ctx.moveTo(x, 0);
				ctx.lineTo(x, height);
			}

			for (let y = 0; y < height; y += gridLength) {
				ctx.moveTo(0, y);
				ctx.lineTo(width, y);
			}

			ctx.stroke();
		}

		this.edges.forEach((edge) =>
			edge.draw(ctx, {
				oriented: this.oriented,
				nodeRadius: this.nodeRadius,
			})
		);

		this.nodes.forEach((node) =>
			node.draw(ctx, selectedNodes.includes(node), {
				radius: this.nodeRadius,
			})
		);

		if (selectionZone) {
			ctx.strokeStyle = "rgb(60, 161, 232)";
			ctx.fillStyle = "rgba(60, 161, 232, 0.2)";

			const zone = [
				selectionZone.x,
				selectionZone.y,
				selectionZone.width,
				selectionZone.height,
			];

			ctx.strokeRect(...zone);
			ctx.fillRect(...zone);
		}
	}
}

const graph = new Graph({
	oriented: false,
	useLetters: true,
});

const selectMove = document.querySelector(".select.move");
const makeNodeButton = document.querySelector(".select.node");
const makeEdgeButton = document.querySelector(".select.edge");
const deleteNodeButton = document.querySelector(".select.delete");
const switchOrientationButton = document.querySelector(".switch.oriented");
const switchGridButton = document.querySelector(".switch.grid");
const undoButton = document.querySelector(".action.undo");
const redoButton = document.querySelector(".action.redo");

selectMove.onclick = (e) => {
	e.stopPropagation();
	action = ACTIONS.Move;

	selectMove.classList.add("active");
	makeNodeButton.classList.remove("active");
	makeEdgeButton.classList.remove("active");
	deleteNodeButton.classList.remove("active");
};

makeNodeButton.onclick = (e) => {
	e.stopPropagation();
	action = ACTIONS.AddNode;

	selectMove.classList.remove("active");
	makeNodeButton.classList.add("active");
	makeEdgeButton.classList.remove("active");
	deleteNodeButton.classList.remove("active");
};

makeEdgeButton.onclick = (e) => {
	e.stopPropagation();
	action = ACTIONS.AddEdge;

	selectMove.classList.remove("active");
	makeNodeButton.classList.remove("active");
	makeEdgeButton.classList.add("active");
	deleteNodeButton.classList.remove("active");
};

deleteNodeButton.onclick = (e) => {
	e.stopPropagation();
	action = ACTIONS.Delete;

	selectMove.classList.remove("active");
	makeNodeButton.classList.remove("active");
	makeEdgeButton.classList.remove("active");
	deleteNodeButton.classList.add("active");
};

switchOrientationButton.onclick = (e) => {
	e.stopPropagation();

	graph.oriented = !graph.oriented;
	switchOrientationButton.classList.toggle("active");
};

switchGridButton.onclick = (e) => {
	e.stopPropagation();

	grid = !grid;
	switchGridButton.classList.toggle("active");

	graph.nodes.forEach((node) => {
		node.x = graph.adaptPos(node.x);
		node.y = graph.adaptPos(node.y);
	});
};

undoButton.onclick = (e) => {
	e.stopPropagation();

	const lastAction = actions.pop();
	if (!lastAction) return;

	switch (lastAction.action) {
		case ACTIONS.AddNode: {
			graph.nodes = graph.nodes.filter((n) => n !== lastAction.node);
			break;
		}

		case ACTIONS.Delete: {
			graph.nodes.push(lastAction.node);
			break;
		}

		case ACTIONS.Move: {
			lastAction.node.x = lastAction.fromX;
			lastAction.node.y = lastAction.fromY;
			break;
		}

		case ACTIONS.AddEdge: {
			graph.edges = graph.edges.filter(
				(edge) => edge.from !== lastAction.from && edge.to !== lastAction.to
			);

			break;
		}
	}

	undoActions.push(lastAction);
};

redoButton.onclick = (e) => {
	e.stopPropagation();

	const lastAction = undoActions.pop();
	if (!lastAction) return;

	switch (lastAction.action) {
		case ACTIONS.AddNode: {
			graph.nodes.push(lastAction.node);
			break;
		}

		case ACTIONS.Delete: {
			graph.nodes = graph.nodes.filter((n) => n !== lastAction.node);
			break;
		}

		case ACTIONS.Move: {
			lastAction.node.x = lastAction.toX;
			lastAction.node.y = lastAction.toY;
			break;
		}

		case ACTIONS.AddEdge: {
			graph.link(lastAction.from, lastAction.to);
			break;
		}
	}

	actions.push(lastAction);
};

document.onclick = (e) => {
	switch (action) {
		case ACTIONS.AddNode: {
			const node = new Node(
				graph.adaptPos(e.clientX),
				graph.adaptPos(e.clientY)
			);

			graph.addNode(node);
			actions.push({ action: ACTIONS.AddNode, node });
			undoActions.length = 0;

			break;
		}

		case ACTIONS.Delete: {
			const node = graph.getNode(e.clientX, e.clientY);
			if (!node) return;

			graph.nodes = graph.nodes.filter((n) => n !== node);
			graph.edges = graph.edges.filter(
				(edge) => edge.from !== node && edge.to !== node
			);

			actions.push({ action: ACTIONS.Delete, node });
			undoActions.length = 0;
			break;
		}
	}
};

document.onmousedown = (e) => {
	switch (action) {
		case ACTIONS.Move: {
			movingNode = graph.getNode(e.clientX, e.clientY) ?? null;
			mouseX = graph.adaptPos(e.clientX);
			mouseY = graph.adaptPos(e.clientY);

			if (movingNode) {
				if (selectedNodes.includes(movingNode)) return;
				if (e.shiftKey) {
					selectedNodes.push(movingNode);
				} else {
					selectedNodes.length = 0;
					selectedNodes.push(movingNode);
				}
			} else {
				selectionZone = {
					x: mouseX,
					y: mouseY,
					width: 0,
					height: 0,
				};
			}

			break;
		}

		case ACTIONS.AddEdge: {
			fromNode = graph.getNode(e.clientX, e.clientY) ?? null;
			break;
		}
	}
};

document.onmousemove = (e) => {
	switch (action) {
		case ACTIONS.Move: {
			if (movingNode) {
				selectedNodes.forEach((node) => {
					node.x = graph.adaptPos(node.x + e.clientX - mouseX);
					node.y = graph.adaptPos(node.y + e.clientY - mouseY);
				});

				mouseX = graph.adaptPos(e.clientX);
				mouseY = graph.adaptPos(e.clientY);
			} else if (selectionZone) {
				selectionZone.width = graph.adaptPos(e.clientX) - selectionZone.x;
				selectionZone.height = graph.adaptPos(e.clientY) - selectionZone.y;
			}

			break;
		}

		case ACTIONS.AddEdge: {
			if (!fromNode) return;

			canvasAction = (graph) => {
				ctx.strokeStyle = "black";
				ctx.beginPath();
				ctx.moveTo(fromNode.x, fromNode.y);
				ctx.lineTo(e.clientX, e.clientY);
				ctx.stroke();

				if (graph.oriented) {
					const angle = Math.atan2(
						e.clientY - fromNode.y,
						e.clientX - fromNode.x
					);

					const arrowLength = 10;
					const arrowAngle = 0.5;

					const arrowX1 =
						e.clientX - arrowLength * Math.cos(angle - arrowAngle);
					const arrowY1 =
						e.clientY - arrowLength * Math.sin(angle - arrowAngle);

					const arrowX2 =
						e.clientX - arrowLength * Math.cos(angle + arrowAngle);
					const arrowY2 =
						e.clientY - arrowLength * Math.sin(angle + arrowAngle);

					ctx.beginPath();
					ctx.moveTo(e.clientX, e.clientY);
					ctx.lineTo(arrowX1, arrowY1);
					ctx.moveTo(e.clientX, e.clientY);
					ctx.lineTo(arrowX2, arrowY2);
					ctx.stroke();
				}
			};

			break;
		}
	}
};

document.onmouseup = (e) => {
	switch (action) {
		case ACTIONS.Move: {
			if (movingNode) {
				actions.push({
					action: ACTIONS.Move,
					node: movingNode,
					fromX: mouseX,
					fromY: mouseY,
					toX: movingNode.x,
					toY: movingNode.x,
				});

				movingNode = null;
				undoActions.length = 0;
			} else {
				const nodes = graph.nodes.filter(
					(node) =>
						node.x >= selectionZone.x &&
						node.x <= selectionZone.x + selectionZone.width &&
						node.y >= selectionZone.y &&
						node.y <= selectionZone.y + selectionZone.height
				);

				if (e.shiftKey) {
					selectedNodes.push(...nodes);
				} else {
					selectedNodes.length = 0;
					selectedNodes.push(...nodes);
				}

				selectionZone = null;
			}

			break;
		}

		case ACTIONS.AddEdge: {
			if (!fromNode) return;

			canvasAction = () => {};

			const node = graph.getNode(e.clientX, e.clientY);

			if (!node) {
				fromNode = null;
				return;
			}

			graph.link(fromNode, node);
			actions.push({ action: ACTIONS.AddEdge, from: fromNode, to: node });
			fromNode = null;
			undoActions.length = 0;
		}
	}
};

function animate() {
	requestAnimationFrame(animate);
	graph.draw(ctx, width, height, selectionZone);
}

animate();
