import MAPS from "./maps.mjs";

let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

const TO_RAD = Math.PI / 180;
const DIRECTION = {
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3,
}


const orgWidth = canvas.clientWidth;
const orgHeight = canvas.clientHeight;

let _width = canvas.clientWidth;
let _height = canvas.clientHeight;
let _padding = 30

let car = document.getElementById("car");
let flame = document.getElementById("flame");
let goal = document.getElementById("loc");
let carRow = 0;
let carColumn = 0;
let prevCarRow = 0;
let prevCarColumn = 0;
let carDirection = DIRECTION.UP

let goalRow = 0;
let goalCol = 0;

let _rows = 0;
let _cols = 0;
let _map = [];
let mapIndex = 0;
let _tileDim = 0
let startRow = 0;
let startCol = 0;
let startDirection = DIRECTION.UP;


let crash = false;
let crashes = 0;
let actions = 0;

let prev = 0;
let actionStack = [];

let editor = null;

window.addEventListener('load', (event) => {


    for (let i = 0; i < MAPS.length; i++) {

        if (localStorage.getItem(`solution_${i}`) != null) {
            mapIndex = i + 1;
        } else {
            break;
        }
    }

    console.log("Starting map", mapIndex)

    if (MAPS.length > mapIndex) {
        loadMap(MAPS[mapIndex]);
        draw();
    }

    editor = window.editor;
    console.log(editor);

});



function downloadSubmission(content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "submission.js";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.getElementById("run").addEventListener("click", async () => {
    await run();
})

document.addEventListener("keydown", async (e) => {

    if (e.ctrlKey && e.key == "r") {
        await run();
    }

});

async function run() {
    editor.save()
    carRow = startRow;
    carColumn = startCol;
    carDirection = startDirection;
    actionStack = [];
    let code = editor.getValue();
    eval(code);

    console.clear();
    carRow = startRow;
    carColumn = startCol;
    prevCarColumn = carColumn;
    prevCarRow = carRow;
    carDirection = startDirection;
    crashes = 0;
    actions = 0;
    crash = false;
    for (let fn of actionStack) {
        eval(`(()=> { _${fn}();})()`);

        if (_map[carRow][carColumn] != " ") {
            crash = true;
            console.log("location", carRow, carColumn, _map[carRow][carColumn]);
            carRow = prevCarRow;
            carColumn = prevCarColumn;
            crashes++;
        }

        await sleep(200);
        draw();
    }

    console.log("Car dir", carDirection);
    _map.forEach(item => console.log(item.length));

    let attGoal = carRow == goalRow && carColumn == goalCol;

    if (attGoal) {
        confetti({ position: { x: orgWidth, y: orgHeight } });
        setTimeout(() => {
            localStorage.setItem(`solution_${mapIndex}`, editor.getValue());
            mapIndex++
            if (mapIndex < MAPS.length) {
                loadMap(MAPS[mapIndex]);
                draw();
                editor.setValue("");
            } else {
                document.body.innerHTML = "";
                for (let i = 0; i < MAPS.length; i++) {
                    document.body.innerText += localStorage.getItem(`solution_${i}`) + "\n";
                }
            }
        }, 5000);
    } else {
        setTimeout(() => {
            crash = false;
            loadMap(MAPS[mapIndex]);
            draw();
        }, 3000);
    }

    console.log("Number of actions:", actions);
    console.log("Number of crashes:", crashes);
    console.log("At goal: ", attGoal ? "yes" : "no");
}


function loadMap(data) {

    _map = data.map.split("\n");
    carRow = data.start.row;
    carColumn = data.start.col;
    carDirection = data.direction;
    prevCarColumn = carColumn;
    prevCarRow = carRow;
    startCol = carColumn;
    startRow = carRow;
    startDirection = carDirection;

    goalRow = data.end.row;
    goalCol = data.end.col;

    let row = _map.length;
    let col = row;
    for (let i = 0; i < _map.length; i++) {
        _map[i] = _map[i];
        if (_map[i].length > row) {
            col = _map[i].length;
        }
    }

    _rows = row;
    _cols = col;
    _tileDim = (_width - (_padding * 2)) / Math.max(_rows, _cols);
    _tileDim = Math.min(_tileDim, 30);

    let width = _tileDim * _cols + _padding * 2;
    let height = _tileDim * _rows + _padding * 2;

    _width = Math.max(width, 300);
    _height = Math.max(height, 300);

    canvas.setAttribute("width", _width);
    canvas.setAttribute("height", _height);

}

function move() {
    actionStack.push("move");
    _move();
}

function _move() {
    actions++;
    prevCarRow = carRow;
    prevCarColumn = carColumn;
    switch (carDirection) {
        case DIRECTION.UP: carRow--;
            break;
        case DIRECTION.DOWN: carRow++;
            break;
        case DIRECTION.RIGHT: carColumn++;
            break;
        case DIRECTION.LEFT: carColumn--;
            break;
        default: console.warn("Unknown direction")
            break;
    }

}


function turn() {
    actionStack.push("turn");
    _turn();
}

function _turn() {
    actions++;
    carDirection++;
    if (carDirection > DIRECTION.LEFT) {
        carDirection = DIRECTION.UP
    }
}

function peek() {
    actionStack.push("peek");
    return _peek();
}

function _peek() {
    actions++;
    let r = carRow;
    let c = carColumn;

    switch (carDirection) {
        case DIRECTION.UP: r--;
            break;
        case DIRECTION.DOWN: r++;
            break;
        case DIRECTION.RIGHT: c++;
            break;
        case DIRECTION.LEFT: c--;
            break;
        default: console.warn("Unknown direction")
            break;
    }

    return _map[r][c] == " ";
}

function atGoal() {
    actionStack.push("atGoal");
    return _atGoal();
}

function _atGoal() {
    return carRow == goalRow && carColumn == goalCol;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}




// Update and Draw Functions ---------------------------------------------------------------------


function draw() {

    ctx.clearRect(0, 0, _width, _height);
    drawMap(_map, _tileDim, _padding);
    drawGrid(_tileDim, _rows, _cols, _padding);
    drawGoal(goal, goalRow, goalCol, _tileDim);
    drawCar(car, carRow, carColumn, _tileDim, carDirection);

    if (crash) {
        drawFlame(flame, carRow, carColumn, _tileDim);
    }
}

function drawMap(map, dim, padding) {
    ctx.save();
    ctx.fillStyle = "black";
    for (let i = 0; i < map.length; i++) {
        for (let j = 0; j < map[i].length; j++) {
            if (map[i][j] != " ") {
                ctx.fillRect((j * dim) + padding, (i * dim) + padding, dim, dim)
            }
        }
    }
    ctx.restore();

}

function drawFlame(flame, row, col, dim) {
    let x = Math.floor(col * dim) + _padding;
    let y = Math.floor(row * dim) + _padding;

    let width = flame.width;
    let height = flame.height;
    width *= _tileDim / width;
    height *= _tileDim / height;

    ctx.save();
    ctx.translate(x, y);
    ctx.drawImage(flame, 0, 0, width, height);
    ctx.restore();

}

function drawGoal(goal, row, col, dim) {
    let x = Math.floor(col * dim) + _padding;
    let y = Math.floor(row * dim) + _padding;

    let width = goal.width;
    let height = goal.height;
    width *= _tileDim / width;
    height *= _tileDim / height;

    ctx.save();
    ctx.translate(x, y);
    ctx.drawImage(goal, 0, 0, width, height);
    ctx.restore();

}

function drawCar(car, row, col, dim, direction = DIRECTION.UP) {

    let x = Math.floor(col * dim) + _padding;
    let y = Math.floor(row * dim) + _padding;

    let width = car.width;
    let height = car.height;
    width *= _tileDim / width;
    height *= _tileDim / height;

    const angle = (direction % 4) * 90 * Math.PI / 180;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    switch (direction % 4) {
        case 0:
            ctx.drawImage(car, 0, 0, width, height);
            break;
        case 1:
            ctx.drawImage(car, 0, -width, width, height);
            break;
        case 2:
            ctx.drawImage(car, -width, -height, width, height);
            break;
        case 3:
            ctx.drawImage(car, -height, 0, width, height);
            break;
    }

    ctx.restore();
}

function drawGrid(dim, rows, cols, padding, color = "rgba(150, 150, 150, .6)") {

    let strokeStyle = ctx.strokeStyle;
    ctx.strokeStyle = color;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            ctx.strokeRect((j * dim) + padding, (i * dim) + padding, dim, dim);
        }
    }
    ctx.strokeStyle = strokeStyle;
}




