// 封装一些方法


const cardColorMap = new Map([
    ["H", "hearts"],
    ["C", "clubs"],
    ["D", "diamond"],
    ["S", "spade"],
])

const cardColorMapRe = new Map([
    ["hearts", "H"],
    ["clubs", "C"],
    ["diamond", "D"],
    ["spade", "S"],
])

const MAX_PERSON_CARD_NUM = 20

const cardValueMap = new Map([
    ['J', 11],
    ['Q', 12],
    ['K', 13],
    ['A', 14],
])

const AREA_ORIGIN = 0
const AREA_THROW = 1
const AREA_NAME = 2
const AREA_CENTER = 3

const CELL_WIDTH = 100
const CELL_HEIGHT = 50
const COL_NUM = 3
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

class PokerManager {
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
        this.init();
    }

    init() {
    }

    // 发牌
    initUsers(users, args = {}) {
        if (!args.isShow) {
            let needCard = args?.needCard || true;
            this.cardInfo.userList = new Array().fill({})
            for (let user of users) {
                let chair = user.chair;
                this.cardInfo.userList[chair] = {
                    cards: needCard ? user.cards : "",
                    chair: user.chair,
                    userID: user.userID
                };
            }

            if (needCard) {
                // 调用发牌函数并打印结果
                const result = dealCards(this.userNum, this.cardTotal, this.bottomNum);

                for (let user of this.cardInfo.userList) {
                    let chair = user.chair;
                    user.cards = this.sortCard(result.players[chair], this.cardInfo.rules)
                }
                this.cardInfo.bottomCards = this.sortCard(result.bottomCards, this.cardInfo.rules);
            }
            console.log(this.cardInfo);
            this.initUserPosition()
        }



        if (args.isShow) {
            this.cleanThrowArea()
            this.initPokerLayout()
        }
    }

    initUserPosition() {
        let isThrow = false
        for (let user of this.cardInfo.userList) {
            this.drawText(user.chair, user.userID, isThrow)
        }
    }

    initPokerLayout() {
        // 绘制底牌
        this.dealCards("top_bottom", this.cardInfo.bottomCards)
        // 绘制玩家牌
        for (let user of this.cardInfo.userList) {
            let chair = user.chair;
            let type = this.getTypeByChair(chair)
            this.dealCards(type, user.cards)

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
            if (typeof cardValue === "O") {
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
        } else if (chair == 1) {
            return "right"
        } else if (chair == 2) {
            if (this.cardInfo.userList.length == 3) {
                return "left"
            } else {
                return "top"
            }
        } else if (chair == 3) {
            return "left"
        }
    }

    // 根据牌的数量和牌的大小计算起始位置
    // 牌的象素高度。牌的宽高比固定为3(h):4(w)。缺省值为200, 高度为4, 宽度为3
    // space为每张牌之间的间隔, 分为横向间隔和纵向间隔
    // 先计算牌总宽度, w = cardWidth + (cardNum - 1) * space
    // 然后起始位置就是 canvas的中心宽度减去牌总宽度的一半, 纵向也是这样计算
    // 如果是出牌位置的, 需要注意下向上或者向左右偏移
    calcStartPos(type, cardNum, args = { isThrow: false, isName: false }) {
        let margin = 0
        let pos = {}
        switch (type) {
            case "bottom":
                if (args?.isThrow) {
                    margin = this.hSpace * 1.5
                } else if (args?.isName) {
                    margin = 0 - (this.cardHeight + this.hSpace)
                }
                pos = {
                    x: Math.floor(this.canvas.width / 2 - (this.cardWidth + (cardNum - 1) * this.wSpace)),
                    y: Math.floor(this.canvas.height - this.cardHeight - 50) - margin,
                }
                break

            case "left":
                if (args.isThrow) {
                    margin = this.cardHeight + this.hSpace
                } else if (args.isName) {
                    margin = 0 - (this.cardWidth)
                }
                pos = {
                    x: Math.floor(this.cardWidth + this.wSpace + margin),
                    y: Math.floor(this.canvas.height / 2 - (this.cardHeight + (cardNum - 1) * this.hSpace)),
                }
                break;

            case "top":
                if (args.isThrow) {
                    margin = this.cardHeight + this.hSpace
                } else if (args.isName) {
                    margin = this.cardHeight - this.hSpace
                }
                pos = {
                    x: Math.floor(this.canvas.width / 2 - (this.cardWidth + (cardNum - 1) * this.wSpace)),
                    y: Math.floor(this.cardHeight * 1.5 + margin),
                }
                break;

            case "right":
                if (args.isThrow) {
                    margin = this.cardHeight + this.hSpace
                } else if (args.isName) {
                    margin = 0 - (this.cardWidth + this.wSpace)
                }
                pos = {
                    x: Math.floor(this.canvas.width - 2 * this.cardWidth - this.wSpace - margin),
                    y: Math.floor(this.canvas.height / 2 - (this.cardHeight + (cardNum - 1) * this.hSpace)),
                }
                break;

            case "top_bottom":
                if (args.isThrow) {
                    margin = this.cardHeight + this.hSpace
                } else if (args.isName) {
                    margin = this.cardHeight - this.hSpace
                }
                pos = {
                    x: Math.floor(this.canvas.width / 2 - (this.cardWidth + (cardNum - 1) * this.wSpace)),
                    y: Math.floor(10),
                }
                break;
            case "center":
                pos = {
                    x: Math.floor(this.canvas.width / 2 - CELL_WIDTH * (COL_NUM / 2)),
                    y: Math.floor(this.canvas.height / 2 - CELL_HEIGHT * (ROW_NUM / 2)),
                }
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
        let realCards = this.getCardList(cards)
        let startPos = this.calcStartPos(type, realCards.length / 2, { isThrow });
        console.log(this.canvas.width, this.canvas.height);
        console.log(startPos);
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
    cleanThrowArea() {
        this.clearCanvas("bottom", AREA_THROW)
        this.clearCanvas("left", AREA_THROW)
        this.clearCanvas("right", AREA_THROW)
        this.clearCanvas("top", AREA_THROW)
    }

    // 清理画布指定位置
    clearCanvas(type, area) {
        let startPos;
        let isThrow = area == AREA_THROW
        let isName = area == AREA_NAME
        let multi = area == AREA_THROW ? -1 : 0
        switch (type) {
            case "bottom":
                startPos = this.calcStartPos(type, MAX_PERSON_CARD_NUM / 2, { isThrow, isName });
                this.ctx.clearRect(startPos.x, startPos.y + this.cardHeight * multi, (this.cardWidth + (MAX_PERSON_CARD_NUM - 1) * this.wSpace), 1.5 * this.cardHeight);
                break;
            case "left":
                startPos = this.calcStartPos(type, MAX_PERSON_CARD_NUM / 2, { isThrow, isName });
                this.ctx.clearRect(startPos.x, startPos.y, this.cardWidth, this.cardHeight + (MAX_PERSON_CARD_NUM - 1) * this.hSpace);
                break;
            case "right":
                startPos = this.calcStartPos(type, MAX_PERSON_CARD_NUM / 2, { isThrow, isName });
                this.ctx.clearRect(startPos.x, startPos.y, this.cardWidth + this.wSpace, this.cardHeight + (MAX_PERSON_CARD_NUM - 1) * this.hSpace);
                break;
            case "top":
                startPos = this.calcStartPos(type, MAX_PERSON_CARD_NUM / 2, { isThrow, isName });
                this.ctx.clearRect(startPos.x, startPos.y, this.cardWidth + (MAX_PERSON_CARD_NUM - 1) * this.wSpace, this.cardHeight);
                break;
            case "top_bottom":
                startPos = this.calcStartPos(type, 4, { isThrow, isName });
                this.ctx.clearRect(startPos.x, startPos.y, this.cardWidth + 6 * this.wSpace, this.cardHeight);
                break;
        }
    }

    clear(x, y, width, height) {
        this.ctx.clearRect(x, y, width, height);
    }

    runAction(action, args, wait = 2) {
        let timeout = wait * 1000
        setTimeout(() => {
            switch (action) {
                case "deal": // 发牌
                    this.actionsDeal(args.users, args.args)
                    break;
                case "throw":
                    this.actionThrow(args.chair, args.throws, args.isNewRound)
                    break;
                case "heiwai":
                    this.actionHeiwai(args.chair, args.isHeiwa)
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
                    this.actionResult(args.chair, args.double)
                    break;

            }
        }, timeout)
    }

    actionThrow(chair, throws, isNewRound) {
        if (isNewRound) {
            this.cleanThrowArea()
        }
        if (throws != "") {
            this.throwCards(chair, throws)
        } else {
            this.drawText(chair, "不要")
        }

    }

    actionResult(chair, double) {
        this.drawResult()
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
        this.cleanThrowArea()
        // 动画暂时不做, 先手牌减少, 然后出牌位置显示
        let now = this.getAddCards(this.cardInfo.userList[chair].cards, this.cardInfo.bottomCards)
        console.log(now);
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
    actionHeiwai(chair, isHeiwa) {
        let text = isHeiwa ? "黑挖" : "不挖"
        this.drawText(chair, text)
    }

    throwCards(chair, throws) {
        // 动画暂时不做, 先手牌减少, 然后出牌位置显示
        let type = this.getTypeByChair(chair)
        let hands = this.cardInfo.userList[chair].cards
        let remains = this.getRemainCards(hands, throws)
        console.log(remains);
        this.clearCanvas(type, AREA_ORIGIN)
        this.dealCards(type, remains)
        this.clearCanvas(type, AREA_THROW)
        this.dealCards(type, throws, true)
        this.cardInfo.userList[chair].cards = remains
    }


    drawText(chair, text, isThrow = true) {
        let type = this.getTypeByChair(chair)
        let area = isThrow ? AREA_THROW : AREA_NAME
        this.clearCanvas(type, area)
        let isName = !isThrow
        let pos = this.calcStartPos(type, 1, { isThrow: isThrow, isName: isName })
        console.log(`drawText: ${type} ${text} ${JSON.stringify(pos)}`)
        this.ctx.font = "bold 30px Arial"; // 也可以设置为 "bold 30px Arial" 等
        this.ctx.textAlign = "left"; // 文字对齐方式
        this.ctx.fillStyle = "black"; // 文字颜色
        this.ctx.fillText(text, pos.x, pos.y)
    }

    drawResult(gameResult) {
        // 设置表格单元格的大小
        const cellWidth = CELL_WIDTH;
        const cellHeight = CELL_HEIGHT;

        let pos = this.calcStartPos("center", 1)

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
        const data = [
            ['玩家名称', '输赢', '银子'],
            ['A1', 'B1', 'C1'],
            ['A2', 'B2', 'C2'],
            ['A3', 'B3', 'C3']
        ];
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
