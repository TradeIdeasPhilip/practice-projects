const direction = {left: {x: -1, y: 0, name: "left"}, up: {x: 0, y: -1, name: "up"}, right: {x: 1, y: 0, name: "right"}, down: { x: 0, y: 1, name: "down"}};

var boardWidth = 20;
var boardHeight = 15;
var board;
var initialLength = 5;
var currentLength;
var lengthToAdd;
var boardContainer;
var currentDirection;
var headPosition;
var tailPosition;

function initOnce()
{
	for (const name in direction)
	{
		const info = direction[name];
		info.display = document.getElementById(name + "_display");
	};
	direction.left.reverse = direction.right;
	direction.right.reverse = direction.left;
	direction.up.reverse = direction.down;
	direction.down.reverse = direction.up;
	direction.left.move = direction.right.move = direction.up.move = direction.down.move = function (point) {
		return {x: point.x + this.x, y : point.y + this.y};
	};
	boardContainer = document.getElementById("board");
	document.addEventListener("keydown", onKeyDown);
	reset();
}

function onKeyDown(keyEvent)
{
	if (currentDirection === undefined)
		return;
	let newDirection;
	switch (keyEvent.code)
	{
		case "ArrowUp": 
		case "KeyW":
			newDirection = direction.up;
			break;
		case "ArrowDown": 
		case "KeyS":
			newDirection = direction.down; 
			break;
		case "ArrowLeft": 
		case "KeyA":
			newDirection = direction.left;
			break;
		case "ArrowRight":
		case "KeyD":
			newDirection = direction.right;
			break;
		case "KeyQ":
			document.getElementById("start-button").click();
			return;
		default:
			return;
	}
	if (board.getSnakeInfo(headPosition).from == newDirection)
	{
		console.log("ouch");
		return;
	}
	keyEvent.cancelBubble = true;
	setDirection(newDirection);
}

function setDirection(newDirection)
{
	currentDirection = newDirection;
	for (const name in direction)
	{
		const info = direction[name];
		info.display.classList[(info == newDirection)?"add":"remove"]("current-direction");
	};
}

function onStart(button)
{
	button.disabled=true;
	mainLoop();
}

function mainLoop()
{
	updateSnake();
	setTimeout(mainLoop, 200);
}

function reset()
{
	board = [];
	for (let column = 0; column < boardWidth; column++)
	{
		const array = new Array(boardHeight);
		// The following line is required to make forEach() work.  When you add items with the Array constructor or by setting the array's length, those items will not be visible to forEach().  forEach will skip any items created by those two methods, but w oill work for items which get assigned, push()ed, or fill()ed later.
		array.fill(undefined);
		board.push(array);
	}
	board.get = function (point)
	{
		if ((point.x < 0) || (point.y < 0) || (point.x >= boardWidth) || (point.y >= boardHeight))
			return { type: "OUT OF BOUNDS" }
		return this[point.x][point.y];
	}
	board.set = function(point, type, info)
	{
		this[point.x][point.y] = {type: type, info: info};
	}
	board.clear = function(point)
	{
		this[point.x][point.y] = undefined;
		// The following is a problem because this index doesn't show up
		// in forEach().
		//delete this[point.x][point.y];
	}
	board.canMoveHere = function (point)
	{
		const found = this.get(point);
		if (found === undefined)
			return "EMPTY";
		if (found.type == "TARGET")
			return "TARGET";
		return "FULL";
	}
	board.createRandomTarget = function ()
	{
		let free = 0;
		this.forEach((column) => {
			column.forEach((value) => {
				if (value === undefined) free++;
			});
		});
		//console.log("free:  " + free);
		if (free < 1)
			return undefined;
		let skip = Math.floor(Math.random() * free);
		let result;
		this.forEach((column, x) => {
			column.forEach((value, y) => {
				if (value === undefined)
				{
					if (skip == 0)
						result = {x: Number(x), y: Number(y)};
					skip--;
				}
			});
		});
		this.set(result, "TARGET");
		return result;
	}
	board.getSnakeInfo = function (point)
	{
		const possible = this.get(point);
		if (possible.type !== "SNAKE")
			return undefined;
		return possible.info;
	}
	board.setSnakeInfo = function (point, info)
	{
		this.set(point, "SNAKE", info); 
	}
	boardContainer.innerText="";
	document.body.style.setProperty("--board-width", boardWidth);
	document.body.style.setProperty("--board-height", boardHeight);
	for (let row = 0; row < boardHeight; row++)
	{
		const rowContainer = document.createElement("div");
		boardContainer.appendChild(rowContainer);
		for (let column = 0; column < boardWidth; column++)
		{
			const item = document.createElement("div");
			item.className = "std-size";
			rowContainer.appendChild(item);
		}
	}
	const snakeY = Math.floor(boardHeight / 2);
	var snakeX = Math.floor((boardWidth - initialLength) / 2);
	for (let i = 0; i < initialLength; i++, snakeX++)
	{
		const position = {x: snakeX, y: snakeY};
		const info = {};
		if (i > 0)
			info.from = direction.left;
		else
			tailPosition = position;
		if (i < initialLength - 1)
			info.to = direction.right;
		else
			headPosition = position;
		drawSnake(position, info);
	}
	setDirection(direction.right);
	lengthToAdd = 0;
	currentLength = initialLength;
	showCurrentLength();
	drawNewTarget();
}

function updateSnake()
{
	if (currentDirection === undefined)
		return;
	const newHead = currentDirection.move(headPosition);
	const newStatus = board.canMoveHere(newHead);
	drawSnake(headPosition, {from: board.getSnakeInfo(headPosition).from, to: currentDirection});
	if (newStatus == "FULL")
	{
		setDirection(undefined);
		return;
	}
	if (newStatus == "TARGET")
		lengthToAdd += 5;
	drawSnake(newHead, {from: currentDirection.reverse});
	headPosition = newHead;
	if (lengthToAdd > 0)
	{
		lengthToAdd--;
		currentLength++;
		showCurrentLength();
	}
	else
	{
		const newTail = board.getSnakeInfo(tailPosition).to.move(tailPosition);
		drawSnake(newTail, {to: board.getSnakeInfo(newTail).to});
		drawEmpty(tailPosition);
		tailPosition = newTail;
	}
	if (newStatus == "TARGET")
		drawNewTarget();
}

function showCurrentLength()
{
	document.getElementById("length").innerText = currentLength;
}

function findCell(point)
{
	if (point === undefined) debugger;
	const row = boardContainer.childNodes[point.y];
	if (row)
		return row.childNodes[point.x];
}

function drawNewTarget()
{
	const point = board.createRandomTarget();
	const cell = findCell(point);
	cell.dataset.shape = "target";
}

function drawEmpty(point)
{
	board.clear(point);
	const cell = findCell(point);
	delete cell.dataset.shape;
}

function drawSnake(point, info)
{
	const cell = findCell(point, info);
	const from = info.from;
	const to = info.to;
	let shape;
	if (((from === undefined) && (to == direction.right))
		|| ((from === direction.right) && (to === undefined)))
		shape = "end-cap-left";
	else if (((from === undefined) && (to == direction.left))
		|| ((from === direction.left) && (to === undefined)))
		shape = "end-cap-right";
	else if (((from === undefined) && (to == direction.up))
		|| ((from === direction.up) && (to === undefined)))
		shape = "end-cap-bottom";
	else if (((from === undefined) && (to == direction.down))
		|| ((from === direction.down) && (to === undefined)))
		shape = "end-cap-top";
	else if (((from == direction.left) && (to == direction.right))
		|| ((from == direction.right) && (to == direction.left)))
		shape = "horizontal";
	else if (((from == direction.up) && (to == direction.down))
		|| ((from == direction.down) && (to == direction.up)))
		shape = "vertical";
	else if (((from == direction.up) && (to == direction.left))
		|| ((from == direction.left) && (to == direction.up)))
		shape = "bottom-right";
	else if (((from == direction.down) && (to == direction.left))
		|| ((from == direction.left) && (to == direction.down)))
		shape = "top-right";
	else if (((from == direction.down) && (to == direction.right))
		|| ((from == direction.right) && (to == direction.down)))
		shape = "top-left";
	else if (((from == direction.up) && (to == direction.right))
		|| ((from == direction.right) && (to == direction.up)))
		shape = "bottom-left";
	else
		shape = "";
	cell.dataset.shape = shape;
	board.setSnakeInfo(point, info);
}
