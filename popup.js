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
  let currentlyHighlightedMoves = []; // To keep track of highlighted squares
  let hasMoved = { // For castling
    whiteKing: false,
    whiteRookA: false, // Queenside (col 0)
    whiteRookH: false, // Kingside (col 7)
    blackKing: false,
    blackRookA: false,
    blackRookH: false
  };
  let enPassantTargetSquare = null; // Format: {row: number, col: number, pieceColor: string} (color of pawn that can be captured)

  /**
   * Creates a deep copy of the board state.
   * @param {Array<Array<string>>} board - The board to copy.
   * @returns {Array<Array<string>>} A new copy of the board.
   */
  function deepCopyBoard(board) {
    return board.map(arr => arr.slice());
  }

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

  // Helper to clear previously highlighted valid move squares
  function clearHighlightedMoves() {
    currentlyHighlightedMoves.forEach(sq => {
      const div = boardElement.querySelector(`.square[data-row='${sq.row}'][data-col='${sq.col}']`);
      if (div) div.classList.remove('valid-move-highlight');
    });
    currentlyHighlightedMoves = [];
  }

  // Helper to highlight valid moves
  function highlightValidMoves(moves) {
    clearHighlightedMoves(); // Clear previous highlights
    moves.forEach(move => {
      const div = boardElement.querySelector(`.square[data-row='${move.row}'][data-col='${move.col}']`);
      if (div) {
        div.classList.add('valid-move-highlight');
        currentlyHighlightedMoves.push({row: move.row, col: move.col});
      }
    });
  }

  function handleSquareClick(row, col) {
    const prevEnPassantTargetSquare = enPassantTargetSquare; // Save EP state for this turn's logic
    enPassantTargetSquare = null; // EP is only valid for one turn

    if (playerTurn === 'over') {
        displayMessage("Game is over. Please start a new game by changing difficulty or clicking 'New Game'.");
        return;
    }
    if (playerTurn !== 'white') {
      displayMessage("It's the AI's turn.");
      return;
    }

    const clickedPieceSymbol = boardState[row][col];

    if (selectedSquare) {
      const fromRow = selectedSquare.row;
      const fromCol = selectedSquare.col;
      const movingPieceSymbol = boardState[fromRow][fromCol];
      const movingPieceColor = 'white';

      const potentialMoves = getValidMovesForPiece(fromRow, fromCol, boardState, movingPieceColor, prevEnPassantTargetSquare);
      const legalMoves = filterMovesLeavingKingSafe(movingPieceColor, potentialMoves, boardState, {row: fromRow, col: fromCol});
      const chosenMove = legalMoves.find(m => m.row === row && m.col === col);

      if (!chosenMove) {
        if (clickedPieceSymbol !== '.' && isWhitePiece(clickedPieceSymbol)) {
          clearHighlightedMoves();
          selectedSquare = { row, col, piece: clickedPieceSymbol };
          // When re-selecting, use the EP square that was valid at the start of this turn.
          const newPotentialMoves = getValidMovesForPiece(row, col, boardState, 'white', prevEnPassantTargetSquare);
          const newLegalMoves = filterMovesLeavingKingSafe('white', newPotentialMoves, boardState, {row,col});
          highlightValidMoves(newLegalMoves);
          renderBoard();
          displayMessage(newLegalMoves.length > 0 ? `Selected ${pieces[clickedPieceSymbol]}. Click destination.` : `Selected ${pieces[clickedPieceSymbol]}. No legal moves.`);
        } else {
          displayMessage("Invalid move. Not a valid destination for the selected piece.");
        }
        return;
      }

      const capturedPieceOriginalSymbol = boardState[row][col];
      boardState[row][col] = movingPieceSymbol;
      boardState[fromRow][fromCol] = '.';
      updateHasMovedState(movingPieceSymbol, fromRow, fromCol);

      if (chosenMove.isEnPassant) {
        const capturedPawnRow = movingPieceColor === 'white' ? row + 1 : row - 1;
        boardState[capturedPawnRow][col] = '.'; // Remove captured pawn
        // moveMsg will be handled below
      } else if (chosenMove.isCastling) {
        if (col === 6) { // Kingside
          boardState[row][5] = boardState[row][7]; boardState[row][7] = '.';
          updateHasMovedState('R', row, 7);
        } else if (col === 2) { // Queenside
          boardState[row][3] = boardState[row][0]; boardState[row][0] = '.';
          updateHasMovedState('R', row, 0);
        }
      }

      if (chosenMove.setsEnPassantTarget) {
        enPassantTargetSquare = chosenMove.setsEnPassantTarget;
      }

      let moveMsg = `Player moved ${pieces[movingPieceSymbol]} to ${String.fromCharCode(97+col)}${8-row}.`;
      if (chosenMove.isEnPassant) {
        moveMsg += ` Captured pawn (en passant).`;
      } else if (capturedPieceOriginalSymbol !== '.' && !chosenMove.isCastling) {
        moveMsg += ` Captured ${pieces[capturedPieceOriginalSymbol]}.`;
      }

      // Pawn Promotion for Player (White)
      if (movingPieceSymbol === 'P' && row === 0) {
        const promotedTo = handlePawnPromotion('white', row, col, boardState);
        moveMsg += ` Pawn promoted to ${pieces[promotedTo]}.`;
        // The boardState is updated by handlePawnPromotion directly.
      }

      selectedSquare = null;
      clearHighlightedMoves();
      renderBoard();

      enPassantTargetSquare = localEnPassantTargetUpdate; // Set global EP for AI's turn *after* player's move is fully processed

      if (isGameOver()) return;

      // Check for Checkmate or Stalemate for AI (after promotion, if any)
      const aiLegalMoves = getAllLegalMovesForPlayer('black', boardState, enPassantTargetSquare);
      if (aiLegalMoves.length === 0) {
        if (isKingInCheck('black', boardState)) {
          displayMessage(moveMsg + " Checkmate! Player (White) wins!");
        } else {
          displayMessage(moveMsg + " Stalemate! Game is a draw.");
        }
        playerTurn = 'over';
        return;
      } else if (isKingInCheck('black', boardState)) {
        moveMsg += " Black King is in check!";
      }
      displayMessage(moveMsg);

      playerTurn = 'black';
      setTimeout(makeAIMove, 500);

    } else if (clickedPieceSymbol !== '.' && isWhitePiece(clickedPieceSymbol)) {
      clearHighlightedMoves();
      selectedSquare = { row, col, piece: clickedPieceSymbol };
      const potentialMoves = getValidMovesForPiece(row, col, boardState, 'white', prevEnPassantTargetSquare);
      const legalMoves = filterMovesLeavingKingSafe('white', potentialMoves, boardState, {row,col});
      highlightValidMoves(legalMoves);
      renderBoard();
      displayMessage(legalMoves.length > 0 ? `Selected ${pieces[clickedPieceSymbol]}. Click destination.` : `Selected ${pieces[clickedPieceSymbol]}. No legal moves.`);
    } else {
      displayMessage("Select one of your pieces to move (White).");
      clearHighlightedMoves();
      selectedSquare = null;
      renderBoard();
    }
  }

  function updateHasMovedState(pieceSymbol, fromRow, fromCol) {
    if (pieceSymbol === 'K' && fromRow === 7 && fromCol === 4) hasMoved.whiteKing = true;
    else if (pieceSymbol === 'R' && fromRow === 7 && fromCol === 0) hasMoved.whiteRookA = true;
    else if (pieceSymbol === 'R' && fromRow === 7 && fromCol === 7) hasMoved.whiteRookH = true;
    // Add black pieces if AI ever uses castling or for general state tracking
    else if (pieceSymbol === 'k' && fromRow === 0 && fromCol === 4) hasMoved.blackKing = true;
    else if (pieceSymbol === 'r' && fromRow === 0 && fromCol === 0) hasMoved.blackRookA = true;
    else if (pieceSymbol === 'r' && fromRow === 0 && fromCol === 7) hasMoved.blackRookH = true;
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

// --- Piece-Specific Movement Logic (Step 1) ---
// These functions determine potential moves based on piece rules and board boundaries.
// They do NOT yet consider obstructions by other pieces (except for pawn captures)
// or check/checkmate rules.

/**
 * Checks if a square is within the board boundaries.
 * @param {number} r Row index.
 * @param {number} c Column index.
 * @returns {boolean} True if the square is on the board.
 */
function isOnBoard(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

/**
 * Gets potential pawn moves, now validating captures and forward obstructions.
 * @param {number} r The row of the pawn.
 * @param {number} c The column of the pawn.
 * @param {string} color The color of the pawn ('white' or 'black').
 * @param {Array<Array<string>>} board The current board state.
 * @param {{row: number, col: number, pieceColor: string} | null} currentEnPassantTarget - EP target from previous turn.
 * @returns {Array<{row: number, col: number, isCapture: boolean, isEnPassant?: boolean, setsEnPassantTarget?: {row: number, col: number, pieceColor: string}}}>} Potential moves.
 */
function getPotentialPawnMoves(r, c, color, board, currentEnPassantTarget) {
  const moves = [];
  const direction = color === 'white' ? -1 : 1;
  const pieceSymbol = board[r][c];

  // Forward one square
  if (isOnBoard(r + direction, c) && board[r + direction][c] === '.') {
    moves.push({ row: r + direction, col: c, isCapture: false });
    // Initial two-square move
    const initialRow = color === 'white' ? 6 : 1;
    if (r === initialRow && isOnBoard(r + 2 * direction, c) && board[r + 2 * direction][c] === '.') {
      moves.push({
        row: r + 2 * direction, col: c, isCapture: false,
        setsEnPassantTarget: { row: r + direction, col: c, pieceColor: color }
      });
    }
  }

  // Diagonal captures
  const captureOffsets = [-1, 1];
  for (const offset of captureOffsets) {
    const nr = r + direction;
    const nc = c + offset;
    if (isOnBoard(nr, nc)) {
      const targetPieceSymbol = board[nr][nc];
      if (targetPieceSymbol !== '.' && isWhitePiece(targetPieceSymbol) !== (color === 'white')) {
        moves.push({ row: nr, col: nc, isCapture: true });
      }
      // En Passant capture
      if (currentEnPassantTarget &&
          nr === currentEnPassantTarget.row &&
          nc === currentEnPassantTarget.col &&
          currentEnPassantTarget.pieceColor !== color) {
        moves.push({ row: nr, col: nc, isCapture: true, isEnPassant: true });
      }
    }
  }
  return moves;
}

/**
 * Gets potential Knight moves, checking for friendly pieces on target.
 * @param {number} r The row of the knight.
 * @param {number} c The column of the knight.
 * @param {string} color The color of the knight.
 * @param {Array<Array<string>>} board The current board state.
 * @returns {Array<{row: number, col: number, isCapture: boolean}>} Potential moves.
 */
function getPotentialKnightMoves(r, c, color, board) {
  const moves = [];
  const knightMoves = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];
  for (const [dr, dc] of knightMoves) {
    const nr = r + dr;
    const nc = c + dc;
    if (isOnBoard(nr, nc)) {
      const targetPiece = board[nr][nc];
      if (targetPiece === '.') {
        moves.push({ row: nr, col: nc, isCapture: false });
      } else if (isWhitePiece(targetPiece) !== (color === 'white')) {
        moves.push({ row: nr, col: nc, isCapture: true });
      }
      // If targetPiece is friendly, it's not a valid move.
    }
  }
  return moves;
}

/**
 * Helper for sliding pieces (Rook, Bishop, Queen), now with obstruction.
 * @param {number} r Start row.
 * @param {number} c Start col.
 * @param {string} color Color of the sliding piece.
 * @param {Array<Array<string>>} board The current board state.
 * @param {Array<Array<number>>} directions Array of [dr, dc] for piece movement.
 * @returns {Array<{row: number, col: number, isCapture: boolean}>} Potential moves.
 */
function getPotentialSlidingMoves(r, c, color, board, directions) {
  const moves = [];
  for (const [dr, dc] of directions) {
    for (let i = 1; i < 8; i++) {
      const nr = r + dr * i;
      const nc = c + dc * i;
      if (isOnBoard(nr, nc)) {
        const targetPiece = board[nr][nc];
        if (targetPiece === '.') {
          moves.push({ row: nr, col: nc, isCapture: false });
        } else {
          if (isWhitePiece(targetPiece) !== (color === 'white')) {
            moves.push({ row: nr, col: nc, isCapture: true }); // Can capture opponent
          }
          // Friendly or opponent, cannot move further in this direction
          break;
        }
      } else {
        break; // Off board
      }
    }
  }
  return moves;
}

/**
 * Gets potential Rook moves with obstruction logic.
 * @param {number} r The row of the rook.
 * @param {number} c The column of the rook.
 * @param {string} color The color of the rook.
 * @param {Array<Array<string>>} board The current board state.
 * @returns {Array<{row: number, col: number, isCapture: boolean}>} Potential moves.
 */
function getPotentialRookMoves(r, c, color, board) {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return getPotentialSlidingMoves(r, c, color, board, directions);
}

/**
 * Gets potential Bishop moves with obstruction logic.
 * @param {number} r The row of the bishop.
 * @param {number} c The column of the bishop.
 * @param {string} color The color of the bishop.
 * @param {Array<Array<string>>} board The current board state.
 * @returns {Array<{row: number, col: number, isCapture: boolean}>} Potential moves.
 */
function getPotentialBishopMoves(r, c, color, board) {
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return getPotentialSlidingMoves(r, c, color, board, directions);
}

/**
 * Gets potential Queen moves with obstruction logic.
 * @param {number} r The row of the queen.
 * @param {number} c The column of the queen.
 * @param {string} color The color of the queen.
 * @param {Array<Array<string>>} board The current board state.
 * @returns {Array<{row: number, col: number, isCapture: boolean}>} Potential moves.
 */
function getPotentialQueenMoves(r, c, color, board) {
  const rookMoves = getPotentialRookMoves(r, c, color, board);
  const bishopMoves = getPotentialBishopMoves(r, c, color, board);
  return rookMoves.concat(bishopMoves);
}

/**
 * Gets potential King moves, checking for friendly pieces on target.
 * Also adds castling moves if conditions are met (for white player only in this step).
 * @param {number} r The row of the king.
 * @param {number} c The column of the king.
 * @param {string} color The color of the king.
 * @param {Array<Array<string>>} board The current board state.
 * @returns {Array<{row: number, col: number, isCapture: boolean, isCastling?: boolean}>} Potential moves.
 */
function getPotentialKingMoves(r, c, color, board) {
  const moves = [];
  const kingMoveOffsets = [
    [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
  ];

  for (const [dr, dc] of kingMoveOffsets) {
    const nr = r + dr;
    const nc = c + dc;
    if (isOnBoard(nr, nc)) {
      const targetPiece = board[nr][nc];
      if (targetPiece === '.') {
        moves.push({ row: nr, col: nc, isCapture: false });
      } else if (isWhitePiece(targetPiece) !== (color === 'white')) {
        moves.push({ row: nr, col: nc, isCapture: true });
      }
    }
  }

  // Castling Logic (only for white player as per subtask)
  if (color === 'white' && r === 7 && c === 4 && !hasMoved.whiteKing && !isKingInCheck(color, board, {row:r, col:c})) {
    // Kingside (O-O)
    if (!hasMoved.whiteRookH && board[7][5] === '.' && board[7][6] === '.' &&
        !isSquareAttacked(7, 5, 'black', board) &&
        !isSquareAttacked(7, 6, 'black', board)) {
      moves.push({ row: 7, col: 6, isCapture: false, isCastling: true });
    }
    // Queenside (O-O-O)
    if (!hasMoved.whiteRookA && board[7][1] === '.' && board[7][2] === '.' && board[7][3] === '.' &&
        !isSquareAttacked(7, 2, 'black', board) &&
        !isSquareAttacked(7, 3, 'black', board)) {
      // Note: King doesn't pass over 7,1 but it must be empty. 7,2 is landing, 7,3 is passage.
      moves.push({ row: 7, col: 2, isCapture: false, isCastling: true });
    }
  }
  return moves;
}


/**
 * Gets all valid moves for a piece at a given square, considering obstructions.
 * This function will be further refined for check validation.
 * @param {number} r The row of the piece.
 * @param {number} c The column of the piece.
 * @param {Array<Array<string>>} board The current board state.
 * @param {string} [pieceColor] Optional: The color of the piece at (r,c). If not provided, it's derived.
 * @param {{row: number, col: number, pieceColor: string} | null} [activeEnPassantTarget] EP target for current turn.
 * @returns {Array<{row: number, col: number, isCapture: boolean, isEnPassant?: boolean, setsEnPassantTarget?: any, isCastling?: boolean}>} A list of valid move squares.
 */
function getValidMovesForPiece(r, c, board, pieceColor, activeEnPassantTarget) {
  const pieceSymbol = board[r][c];
  if (pieceSymbol === '.') return [];

  const color = pieceColor || (isWhitePiece(pieceSymbol) ? 'white' : 'black');
  let validMoves = [];

  switch (pieceSymbol.toLowerCase()) {
    case 'p':
      validMoves = getPotentialPawnMoves(r, c, color, board, activeEnPassantTarget);
      break;
    case 'r':
      validMoves = getPotentialRookMoves(r, c, color, board); // Pass activeEnPassantTarget if rooks could interact with it (they don't)
      break;
    case 'n':
      validMoves = getPotentialKnightMoves(r, c, color, board);
      break;
    case 'b':
      validMoves = getPotentialBishopMoves(r, c, color, board);
      break;
    case 'q':
      validMoves = getPotentialQueenMoves(r, c, color, board);
      break;
    case 'k':
      validMoves = getPotentialKingMoves(r, c, color, board);
      break;
  }
  // At this stage, 'validMoves' from potential functions already consider obstructions.
  // Future steps (check validation) will filter this list further.
  return validMoves;
}

// --- End Piece-Specific Movement Logic ---

// --- Check, Checkmate, Stalemate Logic ---

/**
 * Gets all legal moves for a given player.
 * @param {string} playerColor - 'white' or 'black'.
 * @param {Array<Array<string>>} board - The current board state.
 * @param {{row: number, col: number, pieceColor: string} | null} currentEPTarget - En passant target for this turn.
 * @returns {Array<object>} An array of all legal move objects for the player.
 */
function getAllLegalMovesForPlayer(playerColor, board, currentEPTarget) {
  const allLegalMoves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const pieceSymbol = board[r][c];
      if (pieceSymbol !== '.' && (isWhitePiece(pieceSymbol) === (playerColor === 'white'))) {
        const potentialMoves = getValidMovesForPiece(r, c, board, playerColor, currentEPTarget);
        const legalMovesForPiece = filterMovesLeavingKingSafe(playerColor, potentialMoves, board, { row: r, col: c });
        // Add from information to each move for context if needed later, though not strictly necessary for just checking count
        legalMovesForPiece.forEach(move => allLegalMoves.push({ from: {row: r, col: c}, to: move, piece: pieceSymbol, ...move }));
      }
    }
  }
  return allLegalMoves;
}


/**
 * Filters a list of potential moves to exclude those that leave the king in check.
 * @param {string} kingColor - The color of the king to protect.
 * @param {Array<{row: number, col: number, isCapture: boolean}>} potentialMoves - Moves from getValidMovesForPiece.
 * @param {Array<Array<string>>} currentBoard - The current state of the board.
 * @param {{row: number, col: number}} pieceOriginalPos - The original position of the piece being moved.
 * @returns {Array<{row: number, col: number, isCapture: boolean}>} Filtered list of legal moves.
 */
function filterMovesLeavingKingSafe(kingColor, potentialMoves, currentBoard, pieceOriginalPos) {
  const legalMoves = [];
  const movingPieceSymbol = currentBoard[pieceOriginalPos.row][pieceOriginalPos.col];

  for (const move of potentialMoves) {
    const tempBoard = deepCopyBoard(currentBoard);
    tempBoard[move.row][move.col] = movingPieceSymbol;
    tempBoard[pieceOriginalPos.row][pieceOriginalPos.col] = '.';

    if (!isKingInCheck(kingColor, tempBoard)) {
      legalMoves.push(move);
    }
  }
  return legalMoves;
}


/**
 * Finds the position of the king for a given color.
 * @param {string} kingColor - 'white' or 'black'.
 * @param {Array<Array<string>>} board - The current board state.
 * @returns {{row: number, col: number} | null} - King's position or null if not found.
 */
function findKingPosition(kingColor, board) {
  const kingSymbol = kingColor === 'white' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === kingSymbol) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}


/**
 * Checks if a given square (targetR, targetC) is attacked by the attackerColor.
 * @param {number} targetR - Target row.
 * @param {number} targetC - Target col.
 * @param {string} attackerColor - 'white' or 'black', the color of the pieces attacking.
 * @param {Array<Array<string>>} board - The current board state.
 * @returns {boolean} - True if the square is attacked.
 */
function isSquareAttacked(targetR, targetC, attackerColor, board) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const pieceSymbol = board[r][c];
      if (pieceSymbol === '.') continue;

      const pieceIsWhite = isWhitePiece(pieceSymbol);
      const currentPieceColor = pieceIsWhite ? 'white' : 'black';

      if (currentPieceColor === attackerColor) {
        // Use potential moves which don't consider if the target is friendly/empty for attack check
        let potentialAttacks = [];
        // For pawns, their attack pattern is different from their move pattern
        if (pieceSymbol.toLowerCase() === 'p') {
            const pawnDirection = currentPieceColor === 'white' ? -1 : 1;
            if (isOnBoard(r + pawnDirection, c - 1)) potentialAttacks.push({row: r + pawnDirection, col: c - 1});
            if (isOnBoard(r + pawnDirection, c + 1)) potentialAttacks.push({row: r + pawnDirection, col: c + 1});
        } else {
            // For other pieces, getPotential... usually lists all squares they "control" or can move to.
            // We need to ensure these functions are suitable for "attack" detection.
            // The current getPotential... functions (post-Step2) stop at first piece.
            // This is generally correct for attack lines.
            switch (pieceSymbol.toLowerCase()) {
                case 'r': potentialAttacks = getPotentialRookMoves(r, c, currentPieceColor, board); break;
                case 'n': potentialAttacks = getPotentialKnightMoves(r, c, currentPieceColor, board); break;
                case 'b': potentialAttacks = getPotentialBishopMoves(r, c, currentPieceColor, board); break;
                case 'q': potentialAttacks = getPotentialQueenMoves(r, c, currentPieceColor, board); break;
                case 'k': potentialAttacks = getPotentialKingMoves(r, c, currentPieceColor, board); break; // King attacking a square
            }
        }

        for (const attack of potentialAttacks) {
          if (attack.row === targetR && attack.col === targetC) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Determines if the king of a given color is in check.
 * @param {string} kingColor - The color of the king to check ('white' or 'black').
 * @param {Array<Array<string>>} board - The current board state.
 * @param {{row: number, col: number}} [kingPos] - Optional: The known position of the king.
 * @returns {boolean} - True if the king is in check, false otherwise.
 */
function isKingInCheck(kingColor, board, kingPos) {
  const kingPosition = kingPos || findKingPosition(kingColor, board);
  if (!kingPosition) {
    // This case implies the king is captured, which is a game-over condition
    // handled elsewhere. For check detection, if no king, not in check.
    // Or, it could be an error if called mid-game when king should be present.
    console.warn(`King not found for color ${kingColor} in isKingInCheck.`);
    return false;
  }

  const opponentColor = kingColor === 'white' ? 'black' : 'white';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const pieceSymbol = board[r][c];
      if (pieceSymbol !== '.') {
        const pieceIsWhite = isWhitePiece(pieceSymbol);
        const currentPieceColor = pieceIsWhite ? 'white' : 'black';

        if (currentPieceColor === opponentColor) {
          // Get moves for this opponent piece.
          // IMPORTANT: For check detection, getValidMovesForPiece should consider
          // only basic movement and obstructions, NOT whether the move would put
          // the opponent's own king in check. Our current getValidMovesForPiece
          // from Step 2 (obstruction logic) is suitable here.
          const moves = getValidMovesForPiece(r, c, board, opponentColor);
          for (const move of moves) {
            if (move.row === kingPosition.row && move.col === kingPosition.col) {
              // console.log(`${kingColor} King at ${kingPosition.row},${kingPosition.col} is in check from ${pieceSymbol} at ${r},${c}`);
              return true; // King's square is attackable by this opponent piece
            }
          }
        }
      }
    }
  }
  return false; // No opponent piece can attack the king's square
}

  async function makeAIMove() {
    if (playerTurn !== 'black') return;

    const difficulty = difficultySelect.value;
    displayMessage(`AI (${difficulty}) is thinking...`);

    const prevEnPassantTargetSquareForAI = enPassantTargetSquare;
    let localEnPassantTargetUpdateFromAI = null; // Store EP target set by AI's move

    // AI now uses getAllLegalMovesForPlayer to get its moves
    const aiLegalMoves = getAllLegalMovesForPlayer('black', boardState, prevEnPassantTargetSquareForAI);

    if (aiLegalMoves.length === 0) {
      // isKingInCheck is implicitly handled by getAllLegalMovesForPlayer not finding safe moves.
      // We just need to know if the current board state (before AI tries to move) is a check.
      if (isKingInCheck('black', boardState)) {
        displayMessage("Checkmate! Player (White) wins!");
      } else {
        displayMessage("Stalemate! Game is a draw.");
      }
      playerTurn = 'over';
      renderBoard();
      return;
    }

    let chosenMove;
    const captureMoves = aiLegalMoves.filter(m => m.isCapture && !m.isEnPassant);
    const enPassantMovesAI = aiLegalMoves.filter(m => m.isEnPassant);

    if ((difficulty === 'hard' || difficulty === 'medium') && captureMoves.length > 0) {
        chosenMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
    } else if (enPassantMovesAI.length > 0) {
        chosenMove = enPassantMovesAI[Math.floor(Math.random() * enPassantMovesAI.length)];
    } else if (aiLegalMoves.length > 0) { // Check if there are any moves left
        chosenMove = aiLegalMoves[Math.floor(Math.random() * aiLegalMoves.length)];
    } else {
        // This case should ideally be caught by aiLegalMoves.length === 0 above.
        // If somehow it's reached, it implies an issue or a very specific stalemate not caught.
        displayMessage("AI has no valid moves. Stalemate or error.");
        playerTurn = 'over'; // Or 'white' if we want to investigate
        renderBoard();
        return;
    }

    const capturedPieceOriginalSymbolAI = boardState[chosenMove.to.row][chosenMove.to.col];
    boardState[chosenMove.to.row][chosenMove.to.col] = chosenMove.piece;
    boardState[chosenMove.from.row][chosenMove.from.col] = '.';
    updateHasMovedState(chosenMove.piece, chosenMove.from.row, chosenMove.from.col);

    if (chosenMove.isEnPassant) {
        // Black AI (piece 'p') moves from higher row index to lower (e.g. row 4 to 3 for white perspective)
        // If AI (black) captures EP, its pawn is on row 3 (player pawn was on row 3, EP target was row 2)
        // Player pawn (White 'P') was on row 4, moved to row 2. Black pawn on row 3 takes on row 2.
        // Black pawn moves from its current row (e.g. 3) to EP target row (e.g. 2). Captured pawn is on AI's original row + 1.
        // No, if black pawn (p) is on row 4 (board index), and white pawn (P) on row 6 moves to row 4. EP target is row 5.
        // Black pawn on row 4, moves to row 5 (boardState[4][c] -> boardState[5][c]). Captured white pawn is on row 4 (boardState[4][c]).
        // So, the captured pawn is on chosenMove.from.row, chosenMove.to.col
        // Actually, for black, direction is +1. If black pawn moves from r to r+2, EP target is r+1.
        // White pawn moves from its current row to r+1. Captured black pawn is at r+1, chosenMove.to.col.
        // If AI (black) makes EP capture, it moves to player's pawn's previous skipped square.
        // Player (white) pawn moves P@r4 -> P@r6 (board index 3 to 1). EP target is r5 (board index 2).
        // AI (black) pawn p@r4 (board index 3) captures. Moves to r5 (board index 2). Captured P is at r4 (board index 3).
        const capturedPawnRow = chosenMove.from.row; // The row the AI pawn started from, for EP capture of player pawn
        boardState[capturedPawnRow][chosenMove.to.col] = '.'; // This is incorrect.
        // Correct: captured pawn is on the same rank as the AI's pawn *after* it moves one step, but in the target column.
        // If black moves from row index `r` to `r+1` (EP target), the captured white pawn is at `r+1` in the target column.
        // No, captured pawn for black is at `chosenMove.to.row - 1` (row above where black pawn lands).
         boardState[chosenMove.to.row - 1][chosenMove.to.col] = '.';
    }

    // The 'to' object from getAllLegalMovesForPlayer contains the full move details including 'setsEnPassantTarget'
    if (chosenMove.to.setsEnPassantTarget) {
      localEnPassantTargetUpdateFromAI = chosenMove.to.setsEnPassantTarget;
    }
    enPassantTargetSquare = localEnPassantTargetUpdateFromAI; // Set global EP for Player's turn

    let message = `AI moved ${pieces[chosenMove.piece]} from ${String.fromCharCode(97+chosenMove.from.col)}${8-chosenMove.from.row} to ${String.fromCharCode(97+chosenMove.to.col)}${8-chosenMove.to.row}.`;
    if (chosenMove.isEnPassant) {
        message += ` Captured pawn (en passant).`;
    } else if (capturedPieceOriginalSymbolAI !== '.') {
        message += ` Captured ${pieces[capturedPieceOriginalSymbolAI]}.`;
    }

    // Pawn Promotion for AI (Black)
    if (chosenMove.piece === 'p' && chosenMove.to.row === 7) { // Black pawn reaches player's back rank
        const promotedTo = handlePawnPromotion('black', chosenMove.to.row, chosenMove.to.col, boardState);
        message += ` AI Pawn promoted to ${pieces[promotedTo]}.`;
        // boardState is updated by handlePawnPromotion
    }

    renderBoard();
    if (isGameOver()) return;

    // After AI's move (and potential promotion), check for checkmate/stalemate for White
    const whiteLegalMoves = getAllLegalMovesForPlayer('white', boardState, enPassantTargetSquare);

    if (whiteLegalMoves.length === 0) {
        if (isKingInCheck('white', boardState)) {
            displayMessage(message + " Checkmate! AI (Black) wins!");
        } else {
            displayMessage(message + " Stalemate! Game is a draw.");
        }
        playerTurn = 'over';
    } else if (isKingInCheck('white', boardState)) {
      message += " White King is in check!";
      displayMessage(message + " Your turn.");
    } else {
      displayMessage(message + " Your turn.");
    }

    if (playerTurn !== 'over') {
        playerTurn = 'white';
    }
  }

  /**
   * Handles pawn promotion.
   * @param {string} pieceColor - The color of the pawn promoting ('white' or 'black').
   * @param {number} pawnRow - The row index where the pawn landed.
   * @param {number} pawnCol - The column index where the pawn landed.
   * @param {Array<Array<string>>} board - The board state to update.
   * @returns {string} The symbol of the promoted piece.
   */
  function handlePawnPromotion(pieceColor, pawnRow, pawnCol, board) {
    let promotedPiece = '';
    // For displayMessage, we need to be careful if it's called before or after the main move message.
    // It's better to return the piece and let the calling function update the message.
    if (pieceColor === 'white') {
      // UI PROMPT WOULD BE HERE. Defaulting to Queen.
      // const choice = prompt("Promote pawn to (Q, R, B, N):", "Q") || "Q";
      // promotedPiece = choice.toUpperCase();
      // if (!['Q', 'R', 'B', 'N'].includes(promotedPiece)) promotedPiece = 'Q';
      promotedPiece = 'Q'; // Default for non-interactive
    } else { // AI (black)
      promotedPiece = 'q'; // AI always promotes to Queen for simplicity
    }
    board[pawnRow][pawnCol] = promotedPiece;
    return promotedPiece;
  }

  function resetGame() {
    boardState = JSON.parse(JSON.stringify(initialBoardState));
    selectedSquare = null;
    playerTurn = 'white';
    clearHighlightedMoves();
    hasMoved = {
        whiteKing: false, whiteRookA: false, whiteRookH: false,
        blackKing: false, blackRookA: false, blackRookH: false
    };
    enPassantTargetSquare = null; // Reset EP target
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
