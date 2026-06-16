const SIZE = 8
const TYPES = [
  { icon: '🍓', name: 'strawberry' },
  { icon: '🍊', name: 'orange' },
  { icon: '🍇', name: 'grape' },
  { icon: '🥝', name: 'kiwi' },
  { icon: '🍍', name: 'pineapple' }
]
const START_MOVES = 24
const TARGET_SCORE = 1800

Page({
  data: {
    size: SIZE,
    tiles: [],
    score: 0,
    movesLeft: START_MOVES,
    targetScore: TARGET_SCORE,
    selected: null,
    message: '选择相邻萌果，连成 3 个就能得分！',
    gameOver: false,
    won: false,
    progressPercent: 0,
    progressText: `0/${TARGET_SCORE}`
  },

  onLoad() {
    this.restartGame()
  },

  restartGame() {
    const board = this.createBoard()
    this.setData({
      board,
      score: 0,
      movesLeft: START_MOVES,
      selected: null,
      gameOver: false,
      won: false,
      message: '新局开始！先找两个相邻萌果交换吧。'
    }, () => this.refreshTiles())
  },

  createBoard() {
    const board = []
    for (let row = 0; row < SIZE; row += 1) {
      board[row] = []
      for (let col = 0; col < SIZE; col += 1) {
        let type = this.randomType()
        while (
          (col >= 2 && board[row][col - 1] === type && board[row][col - 2] === type) ||
          (row >= 2 && board[row - 1][col] === type && board[row - 2][col] === type)
        ) {
          type = this.randomType()
        }
        board[row][col] = type
      }
    }
    return board
  },

  randomType() {
    return Math.floor(Math.random() * TYPES.length)
  },

  tapTile(event) {
    if (this.data.gameOver) return
    const { row, col } = event.currentTarget.dataset
    const current = { row: Number(row), col: Number(col) }
    const selected = this.data.selected

    if (!selected) {
      this.setData({ selected: current, message: '再点一个相邻萌果进行交换。' }, () => this.refreshTiles())
      return
    }

    if (selected.row === current.row && selected.col === current.col) {
      this.setData({ selected: null, message: '已取消选择。' }, () => this.refreshTiles())
      return
    }

    if (!this.isNeighbor(selected, current)) {
      this.setData({ selected: current, message: '只能和上下左右相邻的萌果交换哦。' }, () => this.refreshTiles())
      return
    }

    this.trySwap(selected, current)
  },

  isNeighbor(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
  },

  trySwap(a, b) {
    const board = this.cloneBoard(this.data.board)
    this.swap(board, a, b)
    const matches = this.findMatches(board)

    if (!matches.length) {
      this.setData({ selected: null, message: '没有连成 3 个，换个组合试试！' }, () => this.refreshTiles())
      return
    }

    const movesLeft = this.data.movesLeft - 1
    this.setData({ board, selected: null, movesLeft }, () => this.resolveBoard(1))
  },

  resolveBoard(combo) {
    const board = this.cloneBoard(this.data.board)
    const matches = this.findMatches(board)

    if (!matches.length) {
      const won = this.data.score >= TARGET_SCORE
      const gameOver = won || this.data.movesLeft <= 0
      this.setData({
        gameOver,
        won,
        message: gameOver ? (won ? '太棒啦，目标达成！' : '步数用完啦，再挑战一次吧。') : '继续寻找下一组可消除萌果。'
      }, () => this.refreshTiles())
      return
    }

    matches.forEach(({ row, col }) => { board[row][col] = null })
    const gained = matches.length * 40 * combo
    const score = this.data.score + gained
    this.setData({ board, score, message: `消除 ${matches.length} 个，连击 x${combo}，+${gained} 分！` }, () => {
      this.refreshTiles(matches)
      setTimeout(() => {
        const dropped = this.dropTiles(this.cloneBoard(this.data.board))
        this.setData({ board: dropped }, () => {
          this.refreshTiles()
          setTimeout(() => this.resolveBoard(combo + 1), 180)
        })
      }, 180)
    })
  },

  findMatches(board) {
    const found = {}
    const mark = (row, col) => { found[`${row}-${col}`] = { row, col } }

    for (let row = 0; row < SIZE; row += 1) {
      let streak = 1
      for (let col = 1; col <= SIZE; col += 1) {
        if (col < SIZE && board[row][col] !== null && board[row][col] === board[row][col - 1]) {
          streak += 1
        } else {
          if (streak >= 3) for (let i = 0; i < streak; i += 1) mark(row, col - 1 - i)
          streak = 1
        }
      }
    }

    for (let col = 0; col < SIZE; col += 1) {
      let streak = 1
      for (let row = 1; row <= SIZE; row += 1) {
        if (row < SIZE && board[row][col] !== null && board[row][col] === board[row - 1][col]) {
          streak += 1
        } else {
          if (streak >= 3) for (let i = 0; i < streak; i += 1) mark(row - 1 - i, col)
          streak = 1
        }
      }
    }

    return Object.values(found)
  },

  dropTiles(board) {
    for (let col = 0; col < SIZE; col += 1) {
      const stack = []
      for (let row = SIZE - 1; row >= 0; row -= 1) {
        if (board[row][col] !== null) stack.push(board[row][col])
      }
      for (let row = SIZE - 1; row >= 0; row -= 1) {
        board[row][col] = stack.length ? stack.shift() : this.randomType()
      }
    }
    return board
  },

  swap(board, a, b) {
    const temp = board[a.row][a.col]
    board[a.row][a.col] = board[b.row][b.col]
    board[b.row][b.col] = temp
  },

  cloneBoard(board) {
    return board.map(row => row.slice())
  },

  refreshTiles(matched = []) {
    const selected = this.data.selected
    const matchedMap = {}
    matched.forEach(({ row, col }) => { matchedMap[`${row}-${col}`] = true })
    const tiles = []

    this.data.board.forEach((line, row) => {
      line.forEach((type, col) => {
        const fruit = TYPES[type] || TYPES[0]
        tiles.push({
          id: `${row}-${col}`,
          row,
          col,
          type,
          icon: fruit.icon,
          selected: selected && selected.row === row && selected.col === col,
          matched: Boolean(matchedMap[`${row}-${col}`])
        })
      })
    })

    const progressPercent = Math.min(100, Math.floor((this.data.score / TARGET_SCORE) * 100))
    this.setData({
      tiles,
      progressPercent,
      progressText: `${this.data.score}/${TARGET_SCORE}`
    })
  }
})
