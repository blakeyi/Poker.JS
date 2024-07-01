// 封装一些方法


const cardColorMap = new Map([
    ["H", "hearts"],
    ["C", "clubs"],
    ["D", "diamond"],
    ["S", "spade"],
    ["J", ""]
])

const cardColorMapRe = new Map([
    ["hearts", "H"],
    ["clubs", "C"],
    ["diamond", "D"],
    ["spade", "S"],
    ["", "J"],
])

const MAX_PERSON_CARD_NUM = 20

const cardValueMap = new Map([
    ['X', 10],
    ['J', 11],
    ['Q', 12],
    ['K', 13],
    ['A', 14],
    ['O1', 53],
    ['O2', 54],
])

const AREA_ORIGIN = 0 // 正常发牌区
const AREA_THROW = 1
const AREA_NAME = 2
const AREA_CENTER = 3

const CELL_WIDTH = 120
const CELL_HEIGHT = 50
const COL_NUM = 4
const ROW_NUM = 4

// Fisher-Yates 洗牌算法
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        // 随机生成一个从0到当前索引i的整数
        const j = Math.floor(Math.random() * (i + 1));
        // 交换元素
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 创建一副cardTotal张牌的数组
function createDeck(cardTotal) {
    const suits = ['H', 'D', 'C', 'S'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];

    suits.forEach(suit => {
        ranks.forEach(rank => {
            deck.push(`${suit}${rank}`);
        });
    });
    if (cardTotal == 54) {
        deck.push('SO');
        deck.push('DO');
    }
    return deck;
}

// 发牌函数，包括洗牌步骤
function dealCards(playerNum, cardTotal, bottomNum) {
    const deck = createDeck(); // 创建一副牌
    shuffle(deck); // 洗牌

    const players = new Array(playerNum).fill("")
    let bottomCards = ""; // 底牌数组

    let playerCard = (cardTotal - bottomNum) / playerNum
    // 发16张牌给每个玩家
    for (let i = 0; i < playerCard; i++) {
        for (let j = 0; j < players.length; j++) {
            players[j] += deck.shift(); // 从牌堆顶部发牌
        }
    }

    // 发4张底牌
    for (let i = 0; i < 4; i++) {
        bottomCards += deck.shift();
    }

    // 返回发牌结果
    return {
        players: players,
        bottomCards: bottomCards
    };
}

function isNumeric(str) {
    return !isNaN(parseInt(str)) && parseInt(str) == str;
}

class Stack {
    constructor() {
      this.items = []; // 存储栈元素的数组
    }
  
    // 入栈操作
    push(element) {
      this.items.push(element);
    }
  
    // 出栈操作
    pop() {
      if (this.isEmpty()) {
        return 'Stack is empty'; // 如果栈为空，返回提示信息
      }
      return this.items.pop();
    }
  
    // 查看栈顶元素，但不移除
    peek() {
      if (this.isEmpty()) {
        return 'Stack is empty'; // 如果栈为空，返回提示信息
      }
      return this.items[this.items.length - 1];
    }
  
    // 检查栈是否为空
    isEmpty() {
      return this.items.length === 0;
    }
  
    // 获取栈的大小
    size() {
      return this.items.length;
    }
  
    // 清空栈
    clear() {
      this.items = [];
    }
  }

export class PokerManager {
    constructor({
        canvas,
        cardSize = 100,
        wSpace = 40,
        hSpace = 40,
        cardTotal = 52,
        bottomNum = 4,
        userNum = 3,
        rules = {}
    }) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.cardSize = cardSize;
        this.cardHeight = cardSize;
        this.cardWidth = cardSize * 3 / 4;
        this.userNum = userNum;
        this.cardTotal = cardTotal;
        this.bottomNum = bottomNum;
        this.startPos = null;
        this.wSpace = wSpace;
        this.hSpace = hSpace;
        this.cardInfo = {
            userList: null,
            bottomCards: "",
            rules: rules
        }
        this.actionStack = new Stack() // 保存每个action操作之前的状态, 用于恢复
        this.init();
    }

    init() {
    }

    // 发牌
    initUsers(users, args = {}) {
        if (!args.isShow) {
            let needCard = args.needCard
            this.cardInfo.userList = new Array().fill({})
            for (let user of users) {
                let chair = user.chair;
                this.cardInfo.userList[chair] = {
                    cards: !needCard ? this.sortCard(user.cards, this.cardInfo.rules) : "",
                    chair: user.chair,
                    userID: user.userID
                };
            }
            this.cardInfo.bottomCards = args.bottomCards

            if (needCard) {
                // 调用发牌函数并打印结果
                const result = dealCards(this.userNum, this.cardTotal, this.bottomNum);

                for (let user of this.cardInfo.userList) {
                    let chair = user.chair;
                    user.cards = this.sortCard(result.players[chair], this.cardInfo.rules)
                }
                this.cardInfo.bottomCards = this.sortCard(result.bottomCards, this.cardInfo.rules);
            }
            // this.drawBgLine()
            this.initUserPosition()
            console.log(this.cardInfo);
        }



        if (args.isShow) {
            this.initPokerLayout()
    
        }
    }

    initUserPosition() {
        for (let user of this.cardInfo.userList) {
            this.drawText(user.chair, user.userID, AREA_NAME)
        }
    }

    initPokerLayout() {
        // 绘制底牌
        this.dealCards("top_bottom", this.cardInfo.bottomCards)
        
        // 绘制玩家牌
        for (let user of this.cardInfo.userList) {
            let chair = user.chair;
            let type = this.getTypeByChair(chair)
            console.log(`initPokerLayout: chair:${chair} card:${user.cards}`);
            this.dealCards(type, user.cards)
        }
    }

    drawBgLine() {
        // 设置格子线的颜色
        this.ctx.strokeStyle = '#000000';

        // 绘制水平线
        for (let y = 0; y < this.canvas.height; y += this.cardHeight) {
            this.ctx.moveTo(0, y); // 移动画笔到 x=0, y
            this.ctx.lineTo(this.canvas.width, y); // 画线到 x=canvas.width
            this.ctx.stroke(); // 绘制线条
        }

        // 绘制垂直线
        for (let x = 0; x < this.canvas.width; x += this.cardWidth) {
            this.ctx.moveTo(x, 0); // 移动画笔到 x, y=0
            this.ctx.lineTo(x, this.canvas.height); // 画线到 x, y=canvas.height
            this.ctx.stroke(); // 绘制线条
        }
    }

    getQueueValue(cardColor) {
        return (cardColor == "hearts" || cardColor == "diamond") ? "O2" : "O1"
    }
    getRealValueByRules(cardColor, cardValue, rules) {
        let value;
        if (isNumeric(cardValue)) {
            value = parseInt(cardValue)
        } else {
            let temp = cardValue
            if (cardValue === "O") {
                temp = this.getQueueValue(cardColor)
            }
            
            value = cardValueMap.get(temp)
        }

        if (cardValue in rules) {
            value = rules[cardValue]
        }
        return value
    }
    sortCard(cards, rules) {
        let cardList = this.getCardList(cards)
        cardList.sort((a, b) => {
            let realA = this.getRealValueByRules(a.color, a.num, rules)
            let realB = this.getRealValueByRules(b.color, b.num, rules)
            return realB - realA
        })
        return this.getCardStr(cardList)
    }

    // 根据座位号计算位置, 注意三人和四人的区别 0 对应 bottom, 顺时针打牌
    getTypeByChair(chair) {
        if (chair == 0) {
            return "bottom"
        } else if (chair == 2) {
            return "right"
        } else if (chair == 1) {
            if (this.cardInfo.userList.length == 3) {
                return "left"
            } else {
                return "top"
            }
        } else if (chair == 3) {
            return "left"
        }
    }

    // type是座位位置, 上下左右
    // area是牌的位置, 个人信息区, 牌区, 出牌区
    // cardNum是用来计算起始位置和长宽的, 保证牌在中心位置
    // 根据牌的数量和牌的大小计算起始位置
    // 牌的象素高度。牌的宽高比固定为3(h):4(w)。缺省值为200, 高度为4, 宽度为3
    // space为每张牌之间的间隔, 分为横向间隔和纵向间隔
    // 先计算牌总宽度, w = cardWidth + (cardNum - 1) * space
    // 然后起始位置就是 canvas的中心宽度减去牌总宽度的一半, 纵向也是这样计算
    // 如果是出牌位置的, 需要注意下向上或者向左右偏移
    calcStartPos(type, area, cardNum) {
        let pos = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        }
        switch (type) {
            case "bottom":
                // x计算规则一样, y计算规则不一样
                pos.width = Math.floor(this.cardWidth + (cardNum - 1) * this.wSpace)
                pos.height = Math.floor(this.cardHeight)
                pos.x = Math.floor(this.canvas.width / 2 - (this.cardWidth + (cardNum - 1) * this.wSpace) / 2)
                if (area == AREA_NAME) {
                    pos.y = Math.floor(this.canvas.height - this.cardHeight *  0.7)
                } else if (area == AREA_ORIGIN) {
                    pos.y = Math.floor(this.canvas.height - 2 * this.cardHeight)
                } else if (area == AREA_THROW) {
                    pos.y = Math.floor(this.canvas.height - 3 * this.cardHeight - 0.5* this.hSpace)
                }
                break
            case "top":
                // x计算规则一样, y计算规则不一样
                // top要多预留1.5个cardHeight 给底牌显示
                pos.width = Math.floor(this.cardWidth + (cardNum - 1) * this.wSpace)
                pos.height = Math.floor(this.cardHeight)
                pos.x = Math.floor(this.canvas.width / 2 - pos.width / 2)
                if (area == AREA_NAME) {
                    pos.y = Math.floor(1.5 * this.cardHeight)
                } else if (area == AREA_ORIGIN) {
                    pos.y = Math.floor(1.5 * this.cardHeight + 1 * this.cardHeight)
                } else if (area == AREA_THROW) {
                    pos.y = Math.floor(1.5 * this.cardHeight + 2 * this.cardHeight)
                }
                break;
            case "left":
                pos.width = Math.floor(this.cardWidth * 1.5)
                // top要多预留1.5个cardHeight 给底牌显示
                pos.height = Math.floor(this.cardHeight + (cardNum - 1) * this.hSpace)
                pos.y = Math.floor(this.canvas.height / 2 - pos.height / 2)
                if (area == AREA_NAME) {
                    pos.x = Math.floor(0 + this.wSpace)
                } else if (area == AREA_ORIGIN) {
                    pos.x = Math.floor(1 * this.cardWidth + this.wSpace / 3)
                } else if (area == AREA_THROW) {
                    pos.x = Math.floor(2 * this.cardWidth + this.wSpace)
                }
                break;
            case "right":
                pos.width = Math.floor(this.cardWidth * 1.5)
                // top要多预留1.5个cardHeight 给底牌显示
                pos.height = Math.floor(this.cardHeight + (cardNum + 1) * this.hSpace)
                pos.y = Math.floor(this.canvas.height / 2 - pos.height / 2)
                if (area == AREA_NAME) {
                    pos.x = Math.floor(this.canvas.width - this.wSpace / 3)
                } else if (area == AREA_ORIGIN) {
                    pos.x = Math.floor(this.canvas.width - 2 * this.cardWidth)
                } else if (area == AREA_THROW) {
                    pos.x = Math.floor(this.canvas.width - 3 * this.cardWidth - this.wSpace)
                }
                break;

            case "top_bottom":
                pos.width = Math.floor(this.cardWidth * this.bottomNum)
                pos.height = Math.floor(this.cardHeight)
                pos.y = 0
                pos.x = Math.floor(this.canvas.width / 2 - pos.width / 2)
                break;

            case "center":
                pos.width = Math.floor(CELL_WIDTH * COL_NUM)
                pos.height = Math.floor(CELL_HEIGHT * ROW_NUM)
                pos.y = Math.floor(this.canvas.height / 2 - pos.height / 2)
                pos.x = Math.floor(this.canvas.width / 2 - pos.width / 2)

                break;

        }

        return pos
    }

    drawOneCard() {
        this.ctx.drawPokerCard(0, 0, 100, 1, 1);
    }


    moveTo(src, dst) {
        if (src.x > dst.x || src.y > dst.y) {
            return
        }
        var dx = 2; // 水平移动速度
        var dy = 0; // 垂直方向速度，这里为0

        // 清除画布
        canvas.clearRect(0, 0, canvas.canvas.width, canvas.canvas.height);

        // 更新位置
        src.x += dx;
        src.y += dy;

        // 绘制扑克牌
        this.ctx.drawPokerCard(src.x, src.y, 120, 'hearts', '6');
        requestAnimationFrame(() => this.moveTo(src, dst));
    }

    startMove(src, dst) {
        requestAnimationFrame(() => this.moveTo(src, dst));
    }

    // 将牌转成数组
    getCardList(cards) {
        let result = []
        for (var i = 0; i < cards.length - 1; i += 2) {
            let color = cardColorMap.get(cards[i]);
            let num = cards[i + 1]
            if (num == "1") {
                num = "10"
                i++
            }
            if (num == "X") {
                num = "10"
            }

            if (color == "") {
                if (num == "L") {
                    color = "spade"
                } else {
                    color = "diamond"
                }
                num = "O"
            }
            result.push({ color, num })
        }
        return result;
    }

    // 将数组转成牌
    getCardStr(cardList) {
        let result = ""
        for (var i = 0; i < cardList.length; i++) {
            result += cardColorMapRe.get(cardList[i].color)
            result += cardList[i].num
        }
        return result;
    }

    // 画牌
    dealCards(type, cards, isThrow = false) {
        let area = isThrow ? AREA_THROW : AREA_ORIGIN
        let realCards = this.getCardList(cards)
        let startPos = this.calcStartPos(type, area, realCards.length);
        for (var i = 0; i < realCards.length; i++) {
            if (type == "bottom" || type == "top" || type == "top_bottom") {
                this.ctx.drawPokerCard(startPos.x + this.wSpace * i, startPos.y, this.cardSize, realCards[i].color, realCards[i].num);
            }

            if (type == "left" || type == "right") {
                this.ctx.drawPokerCard(startPos.x, startPos.y + this.hSpace * i, this.cardSize, realCards[i].color, realCards[i].num);
            }

        }
    }


    getRemainCards(hands, throws) {
        let remaining = []
        let realHands = this.getCardList(hands)
        let realThrows = this.getCardList(throws)
        for (let card of realHands) {
            let index = realThrows.findIndex(item => item.color == card.color && item.num == card.num)
            if (index > -1) {
                continue
            }
            remaining.push(card)
        }
        return this.getCardStr(remaining)

    }

    getAddCards(hands, bottom) {
        let realHands = this.getCardList(hands)
        let realBottom = this.getCardList(bottom)
        realHands.push(...realBottom)
        return this.sortCard(this.getCardStr(realHands), this.cardInfo.rules)
    }
    clearThrowArea() {
        this.clearCanvas("bottom", AREA_THROW)
        this.clearCanvas("left", AREA_THROW)
        this.clearCanvas("right", AREA_THROW)
    }

    // 清理画布指定位置
    clearCanvas(type, area) {
        let cardNum = MAX_PERSON_CARD_NUM
        if (area == AREA_NAME) {
            cardNum = 2
        }
        if (area == AREA_THROW) {
            cardNum = MAX_PERSON_CARD_NUM / 2
        }
        let startPos = this.calcStartPos(type, area, cardNum);
        this.ctx.clearRect(startPos.x, startPos.y, startPos.width, startPos.height);
    }

    clear(x, y, width, height) {
        this.ctx.clearRect(x, y, width, height);
    }

    clearAll() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    restoreCanvas() {
        if (this.actionStack.isEmpty()) {
            return false
        }
        let imageData = this.actionStack.pop()
        this.ctx.putImageData(imageData, 0, 0);
        return true
    }

    runAction(action, args, wait = 2) {
        let timeout = wait * 1000
        let imageData;
        setTimeout(() => {
            // 执行状态前, 先保存当前状态
            imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.actionStack.push(imageData)
            switch (action) {
                case "deal": // 发牌
                    this.actionsDeal(args.users, args.args)
                    break;
                case "throw":
                    this.actionThrow(args.chair, args.throws)
                    break;
                case "heiwa":
                    this.actionHeiwa(args.chair, args.isHeiwa)
                    break;
                case "auction":
                    this.actionAuction(args.chair, args.auction)
                    break;
                case "bottom":
                    this.actionGiveBottom(args.chair)
                    break;
                case "double":
                    this.actionDouble(args.chair, args.double)
                    break;
                case "result":
                    this.actionResult(args.resultInfos)
                    break;
                case "newRound": // 新的一轮, 清空出牌区
                    this.actionNewRound()
                    break;

            }
        }, timeout)
    }

    actionNewRound() {
        this.clearThrowArea()
    }

    actionThrow(chair, throws) {
        if (throws != "") {
            this.throwCards(chair, throws)
        } else {
            this.drawText(chair, "不要")
        }

    }

    actionResult(resultInfos) {
        this.drawResult(resultInfos)
    }

    actionDouble(chair, double) {
        let text = "不加倍"
        if (double > 1) {
            text = "加倍"
        } else if (double == 2) {
            text = "超级加倍"
        }
        this.drawText(chair, text)
    }

    actionGiveBottom(chair) {
        // 动画暂时不做, 先手牌减少, 然后出牌位置显示
        let now = this.getAddCards(this.cardInfo.userList[chair].cards, this.cardInfo.bottomCards)
        let type = this.getTypeByChair(chair)
        this.clearCanvas(type, AREA_ORIGIN)
        this.dealCards(type, now)
        this.cardInfo.userList[chair].cards = now
    }
    actionAuction(chair, auction) {
        let text = "不叫"
        if (auction > 0) {
            text = `${auction}分`
        }
        this.drawText(chair, text)
    }
    actionsDeal(users, args) {
        this.initUsers(users, args)
    }
    actionHeiwa(chair, isHeiwa) {
        let text = isHeiwa ? "黑挖" : "不挖"
        console.log("actionHeiwa:", chair, isHeiwa);
        this.drawText(chair, text)
    }

    throwCards(chair, throws) {
        // 动画暂时不做, 先手牌减少, 然后出牌位置显示
        let type = this.getTypeByChair(chair)
        let hands = this.cardInfo.userList[chair].cards
        let remains = this.getRemainCards(hands, throws)
        this.clearCanvas(type, AREA_ORIGIN)
        this.dealCards(type, remains)
        this.clearCanvas(type, AREA_THROW)
        this.dealCards(type, throws, true)
        this.cardInfo.userList[chair].cards = remains
    }


    drawText(chair, text, area = AREA_THROW) {
        let type = this.getTypeByChair(chair)
        this.clearCanvas(type, area)
        // 长度按照5张牌的宽度
        let pos = this.calcStartPos(type, area, 1)
        if (area == AREA_NAME && (type == "left" || type == "right")) {
            // 保存当前的绘图状态
            this.ctx.save();
            // 将坐标系原点移动到文本的起始位置
            this.ctx.translate(pos.x, pos.y);
            // 旋转坐标系 -90 度，使得文本竖直向上
            this.ctx.rotate(Math.PI / 2);
            // 设置文本对齐方式为左对齐
            this.ctx.textAlign = 'left';
            // 绘制文本
            this.ctx.fillText(text, 0, 0);
            // 恢复之前保存的绘图状态
            this.ctx.restore();
        } else {
            this.ctx.font = "bold 28px Arial"; // 也可以设置为 "bold 30px Arial" 等
            this.ctx.textAlign = "left"; // 文字对齐方式
            this.ctx.textBaseline = 'top';
            this.ctx.fillStyle = "black"; // 文字颜色
            this.ctx.fillText(text, pos.x, pos.y + 5) // +5是字体有突出,导致清除不掉
        }
    }

    drawResult(resultInfos) {
        // 设置表格单元格的大小
        const cellWidth = CELL_WIDTH;
        const cellHeight = CELL_HEIGHT;

        let pos = this.calcStartPos("center", AREA_CENTER, 1)
        console.log(pos);

        // 绘制表格线条
        for (let i = 0; i <= ROW_NUM; i++) {
            this.ctx.moveTo(pos.x, pos.y + cellHeight * i); // 水平线
            this.ctx.lineTo(pos.x + cellWidth * COL_NUM, pos.y + cellHeight * i);
            this.ctx.stroke();
        }

        // 绘制表格线条
        for (let i = 0; i <= COL_NUM; i++) {
            this.ctx.moveTo(pos.x + cellWidth * i, pos.y); // 垂直线
            this.ctx.lineTo(pos.x + cellWidth * i, pos.y + cellHeight * ROW_NUM);
            this.ctx.stroke();
        }
         // 填充数据到表格
        let data = []
        data.push(['玩家名称', '座位号', '输赢', '银子'])
        for (let i = 0; i < resultInfos.length; i++) {
            let win = "赢"
            if (!resultInfos[i].isWin) {
                win = "输"
            }
            let row = []
            row.push(resultInfos[i].userName)
            row.push(resultInfos[i].chair)
            row.push(win)
            row.push(resultInfos[i].depositDiff)
            data.push(row)
        }


        const textColor = 'black';
        const fontSize = 16;
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.textAlign = "center";

        data.forEach((row, rowIndex) => {
            row.forEach((cellText, cellIndex) => {
                // 计算每个单元格的左上角坐标
                const x = pos.x + cellIndex * cellWidth;
                const y = pos.y + (rowIndex + 1) * cellHeight; // 加1 为了基线对齐
                // 绘制文本
                this.ctx.fillStyle = textColor;
                this.ctx.fillText(cellText, x + CELL_WIDTH / 2, y - CELL_HEIGHT / 2); // 偏移量根据需要调整
            });
        });
    }

}
