console.log("Popup script loaded.");

document.addEventListener('DOMContentLoaded', () => {
  const boardElement = document.getElementById('board');
  const difficultySelect = document.getElementById('difficulty');
  const resetButton = document.getElementById('resetButton');

  // statusElement was previously created here, ensure it's still correctly placed or handled.
  // If popup.html now explicitly includes <div id="statusMessages"></div>, then we just need to get it.
  let statusElement = document.getElementById('statusMessages');
  // If it's not in HTML, create and insert it as before.
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.setAttribute('id', 'statusMessages');
    // Insert after board, before controls. Adjust based on final HTML structure.
    // Assuming controls div is sibling to board's parent or similar.
    // If .controls is directly after #board:
    const controlsDiv = document.querySelector('.controls');
    if (controlsDiv) {
        controlsDiv.parentNode.insertBefore(statusElement, controlsDiv);
    } else { // Fallback if structure is different, append after board
        boardElement.parentNode.insertBefore(statusElement, boardElement.nextSibling);
    }
  }


  const pieces = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };

  const initialBoardState = [ // Made const as it should not be reassigned
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  ];
  let boardState = JSON.parse(JSON.stringify(initialBoardState)); // Deep copy

  let selectedSquare = null;
  let playerTurn = 'white'; // Player (white) starts

  function renderBoard() {
    boardElement.innerHTML = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        square.classList.add('square');
        if ((row + col) % 2 === 0) {
          square.classList.add('light');
        } else {
          square.classList.add('dark');
        }
        square.dataset.row = row;
        square.dataset.col = col;

        const pieceSymbol = boardState[row][col];
        if (pieceSymbol !== '.') {
          square.textContent = pieces[pieceSymbol] || '';
          square.classList.add(isWhitePiece(pieceSymbol) ? 'white-piece' : 'black-piece');
        }

        square.addEventListener('click', () => handleSquareClick(row, col));
        boardElement.appendChild(square);
      }
    }
    // Highlight selected square
    if (selectedSquare) {
        const selectedDiv = boardElement.querySelector(`.square[data-row='${selectedSquare.row}'][data-col='${selectedSquare.col}']`);
        if (selectedDiv) selectedDiv.classList.add('selected-square');
    }
  }

  function displayMessage(message) {
    statusElement.textContent = message;
  }

  function handleSquareClick(row, col) {
    if (playerTurn === 'over') {
        displayMessage("Game is over. Please start a new game.");
        return;
    }
    if (playerTurn !== 'white') {
      displayMessage("It's the AI's turn.");
      return;
    }

    const piece = boardState[row][col];

    if (selectedSquare) {
      const fromRow = selectedSquare.row;
      const fromCol = selectedSquare.col;
      const targetPiece = boardState[row][col];

      if (targetPiece === '.' || (targetPiece !== '.' && !isWhitePiece(targetPiece))) {
        boardState[row][col] = boardState[fromRow][fromCol];
        boardState[fromRow][fromCol] = '.';
        selectedSquare = null;
        renderBoard();

        if (isGameOver()) return;

        playerTurn = 'black';
        displayMessage("AI is thinking...");
        setTimeout(makeAIMove, 500);
      } else {
        if (piece !== '.' && isWhitePiece(piece)) {
            selectedSquare = { row, col };
            renderBoard();
            displayMessage("Selected piece. Click on destination square.");
        } else {
            selectedSquare = null;
            renderBoard();
            displayMessage("Invalid move. Try again or select a different piece.");
        }
      }
    } else if (piece !== '.' && isWhitePiece(piece)) {
      selectedSquare = { row, col };
      renderBoard();
      displayMessage(`Selected ${pieces[piece]}. Click destination.`);
    } else {
        displayMessage("Select one of your pieces (White).");
    }
  }

  function isGameOver() {
    let whiteKingFound = false;
    let blackKingFound = false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (boardState[r][c] === 'K') whiteKingFound = true;
            if (boardState[r][c] === 'k') blackKingFound = true;
        }
    }
    if (!whiteKingFound) {
        displayMessage("Game Over. AI (Black) wins!");
        playerTurn = 'over';
        return true;
    }
    if (!blackKingFound) {
        displayMessage("Game Over. Player (White) wins!");
        playerTurn = 'over';
        return true;
    }
    return false;
  }

  function isWhitePiece(pieceSymbol) {
    return pieceSymbol !== '.' && pieceSymbol === pieceSymbol.toUpperCase();
  }

  async function makeAIMove() {
    if (playerTurn !== 'black') return;

    const difficulty = difficultySelect.value;
    displayMessage(`AI (${difficulty}) is thinking...`);

    const aiMove = getSimulatedAIMove(boardState, difficulty);

    if (aiMove && aiMove.from && aiMove.to) {
      const { from, to } = aiMove;
      const movedPiece = boardState[from.row][from.col];

      if (movedPiece === '.' || isWhitePiece(movedPiece)) {
          console.error("AI attempted an invalid move (not its piece or empty):", aiMove);
          displayMessage("AI error. Player's turn.");
          playerTurn = 'white';
          renderBoard();
          return;
      }

      boardState[to.row][to.col] = movedPiece;
      boardState[from.row][from.col] = '.';
      renderBoard();
      displayMessage(`AI moved ${pieces[movedPiece]} from ${String.fromCharCode(97+from.col)}${8-from.row} to ${String.fromCharCode(97+to.col)}${8-to.row}. Your turn.`);

      if (isGameOver()) return;

      playerTurn = 'white';
    } else {
      let blackPiecesCanMove = false;
      // Simplified check for AI moves (already in previous version)
      for (let r = 0; r < 8; r++) { for (let c = 0; c < 8; c++) {
        const piece = boardState[r][c]; if (piece !== '.' && !isWhitePiece(piece)) {
        if (piece === 'p') { if (r + 1 < 8 && boardState[r+1][c] === '.') { blackPiecesCanMove = true; break; }}
        else { const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
        for(const [dr,dc] of dirs){ const nr=r+dr,nc=c+dc; if(nr>=0&&nr<8&&nc>=0&&nc<8&&(boardState[nr][nc]==='.'||isWhitePiece(boardState[nr][nc]))){blackPiecesCanMove=true;break;}}
        } if(blackPiecesCanMove)break;}} if(blackPiecesCanMove)break;}

      if (!blackPiecesCanMove) {
          displayMessage("Game Over! Player (White) wins - AI has no moves!");
          playerTurn = 'over';
      } else {
          displayMessage("AI failed to move or has no moves. Your turn.");
          playerTurn = 'white';
      }
      renderBoard();
    }
  }

  function getSimulatedAIMove(currentBoard, difficulty) {
    let possibleMoves = [];
    for (let r = 0; r < 8; r++) { for (let c = 0; c < 8; c++) {
        const piece = currentBoard[r][c];
        if (piece !== '.' && !isWhitePiece(piece)) {
          if (piece === 'p') {
            if (r + 1 < 8 && currentBoard[r+1][c] === '.') { possibleMoves.push({ from: {row:r,col:c}, to: {row:r+1,col:c}, type:'move'});}
            if (r + 1 < 8 && c + 1 < 8 && currentBoard[r+1][c+1]!=='.' && isWhitePiece(currentBoard[r+1][c+1])) { possibleMoves.push({ from:{row:r,col:c}, to:{row:r+1,col:c+1}, type:'capture'});}
            if (r + 1 < 8 && c - 1 >= 0 && currentBoard[r+1][c-1]!=='.' && isWhitePiece(currentBoard[r+1][c-1])) { possibleMoves.push({ from:{row:r,col:c}, to:{row:r+1,col:c-1}, type:'capture'});}
          } else {
            const directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
            for(const [dr,dc] of directions) { const nr=r+dr, nc=c+dc; if(nr>=0&&nr<8&&nc>=0&&nc<8) {
              if(currentBoard[nr][nc]==='.'){possibleMoves.push({from:{row:r,col:c},to:{row:nr,col:nc},type:'move'});}
              else if(isWhitePiece(currentBoard[nr][nc])){possibleMoves.push({from:{row:r,col:c},to:{row:nr,col:nc},type:'capture'});}
            }}
          }
        }
    }}

    if (possibleMoves.length > 0) {
      let chosenMove;
      if (difficulty === 'hard' || difficulty === 'medium') {
        const captureMoves = possibleMoves.filter(m => m.type === 'capture');
        if (captureMoves.length > 0) { chosenMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];}
        else { chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];}
      } else { chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];}
      return chosenMove;
    }
    return null;
  }

  function resetGame() {
    boardState = JSON.parse(JSON.stringify(initialBoardState));
    selectedSquare = null;
    playerTurn = 'white';
    renderBoard();
    displayMessage("New game started. Player's turn (White).");
  }

  resetButton.addEventListener('click', resetGame);

  difficultySelect.addEventListener('change', () => {
    console.log(`Difficulty changed to: ${difficultySelect.value}`);
    resetGame();
  });

  // Initial setup
  renderBoard();
  // Check if a game was in progress (e.g. via chrome.storage.local) or always start fresh.
  // For this version, we always start with a message indicating it's white's turn.
  // If a game is over from a previous session that wasn't reset, this message might be slightly off
  // until the first interaction or reset. But resetGame() is not called on initial load here.
  if (playerTurn !== 'over') { // Only show this if game is not already over from a persisted state (if we had one)
    displayMessage("Game loaded. Player's turn (White).");
  } else {
    // If we were loading state and game was over:
    // displayMessage("Game is over. Start a new game.");
    // For now, this branch is unlikely to be hit without state persistence.
    // If isGameOver() was true from the initial boardState (which it isn't), then this would matter.
    // The current code calls displayMessage after renderBoard, so it's fine.
    // The prompt asks for "Game started. Player's turn (White)."
    // Let's ensure the initial message is consistent with a new game if not loading state.
    // The provided resetGame function sets this message.
    // If we want the game to truly reset on every popup open, call resetGame() here.
    // Otherwise, the current behavior (retaining state until explicit reset) is fine.
    // The prompt's initial message implies a fresh game or continuation.
    // The initial `displayMessage` call handles this.
    displayMessage("Game ready. Player's turn (White)."); // Or "Game loaded..."
  }

});
