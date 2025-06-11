# Chrome Chess AI Extension

## How it Works

This Chrome extension provides a single-player chess experience, allowing you to play against a computer AI directly in your browser popup.

**Core Features:**

*   **Single-Player vs. AI:** Play chess against an AI opponent.
*   **Difficulty Levels:** Choose from 'Easy', 'Medium', or 'Hard' difficulty settings for the AI. (Note: The current AI strategy is basic; difficulty levels primarily influence move selection from available legal moves rather than implementing vastly different strategic depths.)
*   **Full Chess Rules:** The game implements standard chess rules, including:
    *   Standard piece movements (Pawn, Rook, Knight, Bishop, Queen, King).
    *   Piece captures and board obstruction.
    *   **Check Detection:** The game identifies when a King is in check.
    *   **Checkmate & Stalemate:** Correctly determines checkmate (win/loss) and stalemate (draw) conditions, ending the game appropriately.
    *   **Castling:** Kingside and queenside castling are available for the player (White) under standard conditions. (AI castling is not currently implemented).
    *   **En Passant:** This special pawn capture is fully implemented.
    *   **Pawn Promotion:** Pawns reaching the opponent's back rank are promoted. Player's pawns default to promoting to a Queen; the AI's pawns automatically promote to a Queen.
*   **Interactive UI:** Play directly within the Chrome extension's popup window. Click to select your pieces and click again on a valid square to move. Valid moves are highlighted.
*   **Game Controls:**
    *   **New Game Button:** Start a new game at any time.
    *   **Difficulty Selector:** Change the AI's difficulty level (this also resets the game).
*   **Status Messages:** The game provides feedback on moves, check status, and game end conditions.

## Deployment / Installation

To use this Chrome extension, you can load it as an unpacked extension in Google Chrome. Follow these steps:

1.  **Download or Clone the Code:**
    *   Ensure you have all the project files (`manifest.json`, `popup.html`, `popup.js`, `style.css`, and this `README.md`) in a single directory on your computer.

2.  **Open Chrome Extensions Page:**
    *   Open your Google Chrome browser.
    *   Type `chrome://extensions` in the address bar and press Enter.

3.  **Enable Developer Mode:**
    *   In the top right corner of the Extensions page, find the "Developer mode" toggle and switch it on.

4.  **Load Unpacked Extension:**
    *   Once Developer mode is enabled, you will see new buttons appear. Click on the "Load unpacked" button.

5.  **Select Project Directory:**
    *   A file dialog will open. Navigate to and select the directory where you saved the extension's files.
    *   Click "Select Folder" (or the equivalent button on your OS).

6.  **Extension Ready:**
    *   The "Chess AI Extension" should now appear in your list of extensions and be ready to use.
    *   You can click on its icon (usually a default puzzle piece icon unless customized) in the Chrome toolbar to open the chess game popup.

If you make changes to the code, you may need to click the "reload" button (a circular arrow icon) on the extension's card in the `chrome://extensions` page for the changes to take effect.

## Files Overview

This project consists of the following core files:

*   `manifest.json`:
    *   The manifest file is essential for any Chrome extension.
    *   It defines metadata about the extension (name, version, description), specifies permissions it requires, and points to important files like the popup HTML.

*   `popup.html`:
    *   This HTML file defines the structure of the user interface that appears when you click the extension's icon in the Chrome toolbar.
    *   It includes the chessboard area, difficulty selector, "New Game" button, and status message display.

*   `popup.js`:
    *   This JavaScript file contains all the logic for the chess game.
    *   It handles:
        *   Rendering the chessboard and pieces.
        *   Implementing all chess rules (piece movements, captures, check, checkmate, stalemate, castling, en passant, pawn promotion).
        *   Managing game state (board position, current player, difficulty).
        *   Simulating the AI opponent's moves.
        *   Handling user interactions (clicking on squares, selecting difficulty, starting a new game).

*   `style.css`:
    *   This CSS file provides all the styling for the `popup.html` interface.
    *   It styles the board, pieces, buttons, and other visual elements to make the game presentable and user-friendly.

## Future Enhancements (Optional)

(Ideas for future development)
