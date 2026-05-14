# Easy Select Translate

A Chrome extension that allows users to quickly translate selected text on any webpage.

## Features

- Quick translation by text selection
- Text-to-speech functionality
- Part of speech analysis
- Clean and intuitive UI
## Preview
![Preview](assets/preview-readme.png)
## Installation

1. Clone this repository
```bash
git clone https://github.com/luckfunc/easy-select-translate.git
```
2. Install dependencies and build the extension
```bash
npm install
npm run build
```
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the `dist` directory

## Development

```bash
npm run dev
```

The watch build writes extension files to `dist`. Reload the unpacked extension in Chrome after changes.

## Usage

1. Select any text on a webpage
2. Click the translation icon that appears
3. View the translation in a popup window
4. Click the speaker icon to hear the pronunciation

## Author

- **LuckFunc**
- GitHub: [@luckfunc](https://github.com/luckfunc)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
