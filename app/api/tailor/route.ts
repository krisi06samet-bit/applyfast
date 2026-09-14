:root {
  --bg: #0c1117;
  --panel: #131a23;
  --panel-soft: #18212c;
  --text: #f4f6f8;
  --muted: #98a4b1;
  --line: rgba(255, 255, 255, 0.09);
  --gold: #d8bd83;
  --gold-strong: #e4c98f;
  --gold-soft: rgba(216, 189, 131, 0.12);
  --danger: #ff9d9d;
}

* {
  box-sizing: border-box;
}

html {
  background: var(--bg);
  scroll-behavior: smooth;
}

body {
  margin: 0;
  color: var(--text);
  background:
    radial-gradient(
      circle at 80% 5%,
      rgba(216, 189, 131, 0.07),
      transparent 28%
    ),
    linear-gradient(180deg, #0b1016 0%, #0d1219 100%);
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

button,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

a {
  color: inherit;
  text-decoration: none;
}

h1,
h2,
h3,
h4,
p {
  margin-top: 0;
}

.appShell {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.organicBackdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(
      circle at 14% 8%,
      rgba(60, 92, 135, 0.08),
      transparent 24%
    ),
    radial-gradient(
      circle at 85% 23%,
      rgba(216, 189, 131, 0.05),
      transparent 22%
    );
}

.navBar {
  width: min(1080px, calc(100% - 32px));
  margin: 0 auto;
  padding: 22px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid var(--line);
}

.wordmark {
  display: inline-flex;
  align-items: center;
  font-weight: 760;
  font-size: 22px;
  letter-spacing: -0.6px;
}

.wordmarkMark {
  width: 34px;
  height: 34px;
  margin-right: 10px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  color: #19170f;
  background: linear-gradient(145deg, #ead29f, #c9a868);
  font-weight: 850;
}

.pricePill {
  padding: 8px 12px;
  border: 1px solid rgba(216, 189, 131, 0.25);
  border-radius: 999px;
  background: rgba(216, 189, 131, 0.07);
  color: #dec99f;
  font-size: 12px;
  white-space: nowrap;
}

.toolPage {
  width: min(900px, calc(100% - 32px));
  margin: 0 auto;
  padding: 56px 0 74px;
}

.intro {
  max-width: 690px;
  margin: 0 auto 28px;
  text-align: center;
}

.eyebrow {
  margin-bottom: 8px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.intro h1 {
  margin-bottom: 13px;
  font-size: clamp(38px, 6vw, 58px);
  line-height: 1.04;
  letter-spacing: -2.2px;
}

.introCopy {
  max-width: 580px;
  margin: 0 auto;
  color: var(--muted);
  font-size: 17px;
}

.modeSelector {
  max-width: 720px;
  margin: 0 auto 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.modeButton {
  min-height: 76px;
  padding: 14px 15px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
  color: #dfe4e9;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
}

.modeButton:hover {
  transform: translateY(-1px);
  border-color: rgba(216, 189, 131, 0.25);
}

.modeButton.active {
  border-color: rgba(216, 189, 131, 0.7);
  background: rgba(216, 189, 131, 0.1);
}

.modeTitle {
  font-size: 14px;
  font-weight: 750;
}

.modeCopy {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
}

.toolCard {
  max-width: 720px;
  margin: 0 auto;
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: linear-gradient(
    180deg,
    rgba(23, 31, 42, 0.96),
    rgba(16, 22, 30, 0.96)
  );
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
}

.stepRow {
  display: flex;
  gap: 13px;
  align-items: flex-start;
  margin-bottom: 13px;
}

.stepRow > span {
  width: 30px;
  height: 30px;
  min-width: 30px;
  display: grid;
  place-items: center;
  color: var(--gold);
  background: var(--gold-soft);
  border: 1px solid rgba(216, 189, 131, 0.3);
  border-radius: 50%;
  font-size: 12px;
  font-weight: 800;
}

.stepRow h2 {
  margin-bottom: 3px;
  font-size: 19px;
  letter-spacing: -0.3px;
}

.stepRow p {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 13px;
}

textarea,
input {
  width: 100%;
  color: var(--text);
  background: #0b1118;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}

textarea {
  min-height: 148px;
  margin-bottom: 23px;
  padding: 15px 16px;
  resize: vertical;
  line-height: 1.6;
}

input {
  min-height: 49px;
  padding: 12px 14px;
}

textarea::placeholder,
input::placeholder {
  color: #6d7885;
}

textarea:focus,
input:focus {
  border-color: rgba(216, 189, 131, 0.72);
  box-shadow: 0 0 0 3px rgba(216, 189, 131, 0.07);
  background: #0e151e;
}

.contactHeading {
  margin: 3px 0 12px;
}

.contactHeading h3 {
  margin-bottom: 3px;
  font-size: 14px;
}

.contactHeading p {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 12px;
}

.contactGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 18px;
}

.fullInput {
  grid-column: 1 / -1;
}

.generateButton {
  width: 100%;
  min-height: 54px;
  padding: 13px 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid #ead29e;
  border-radius: 13px;
  color: #17150f;
  background: linear-gradient(120deg, #ead09a, #caa86a);
  font-size: 15px;
  font-weight: 800;
  box-shadow: 0 10px 28px rgba(216, 189, 131, 0.12);
  transition:
    filter 0.15s ease,
    transform 0.15s ease;
}

.generateButton:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.generateButton:disabled {
  opacity: 0.68;
}

.truthNote {
  margin: 11px 0 0;
  color: #7f8b97;
  text-align: center;
  font-size: 11px;
}

.error {
  margin-top: 15px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 120, 120, 0.24);
  border-radius: 11px;
  color: var(--danger);
  background: rgba(255, 80, 80, 0.06);
  font-size: 13px;
}

.resultSection {
  max-width: 900px;
  margin: 58px auto 0;
  scroll-margin-top: 24px;
}

.resultHeading {
  margin-bottom: 20px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
}

.resultHeading h2 {
  margin: 0 0 4px;
  font-size: 31px;
  letter-spacing: -1px;
}

.resultHeading > div > p:last-child {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 13px;
}

.readyBadge {
  flex-shrink: 0;
  padding: 7px 11px;
  color: #bad5a5;
  background: rgba(126, 166, 91, 0.08);
  border: 1px solid rgba(126, 166, 91, 0.28);
  border-radius: 999px;
  font-size: 11px;
}

.insights {
  margin-bottom: 18px;
  padding: 20px 22px;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 24px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: rgba(19, 26, 35, 0.88);
}

.scoreBlock {
  display: flex;
  align-items: center;
  gap: 17px;
}

.scoreNumber {
  color: var(--gold);
  font-size: 45px;
  font-weight: 760;
  line-height: 1;
  letter-spacing: -2px;
}

.scoreNumber span {
  margin-left: 2px;
  color: #a9956d;
  font-size: 15px;
  letter-spacing: 0;
}

.insights h3 {
  margin-bottom: 2px;
  font-size: 13px;
}

.insights p {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
}

.keywordsBlock {
  padding-left: 24px;
  border-left: 1px solid var(--line);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 9px;
}

.chips span {
  max-width: 100%;
  padding: 5px 9px;
  color: #dfcba5;
  background: rgba(216, 189, 131, 0.08);
  border: 1px solid rgba(216, 189, 131, 0.2);
  border-radius: 999px;
  font-size: 11px;
  overflow-wrap: anywhere;
}

.chips .muted {
  color: var(--muted);
  border-color: var(--line);
  background: transparent;
}

.documentStack {
  display: grid;
  gap: 20px;
}

.cvPaper,
.letterPaper {
  color: #292d31;
  background: #f7f6f1;
  border-radius: 12px;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.24);
}

.cvPaper {
  padding: 40px 46px 44px;
  border-top: 4px solid #af9258;
}

.cvTop {
  padding-bottom: 20px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid #d8d4c8;
}

.cvTop h2 {
  margin-bottom: 3px;
  color: #23272b;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -0.8px;
}

.cvHeadline {
  margin-bottom: 0;
  color: #7f6738;
  font-size: 14px;
  font-weight: 700;
}

.contactLine {
  max-width: 46%;
  margin: 4px 0 0;
  color: #666c6c;
  font-size: 11px;
  text-align: right;
}

.cvSection {
  margin-top: 25px;
}

.cvSection > h3 {
  margin-bottom: 10px;
  color: #826b3e;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.cvSection > p {
  margin-bottom: 0;
  font-size: 13px;
  line-height: 1.68;
}

.skillGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.skillGrid span {
  padding: 5px 9px;
  color: #44483f;
  background: #eeece3;
  border: 1px solid #ded8c8;
  border-radius: 4px;
  font-size: 11px;
}

.entryList {
  display: grid;
  gap: 20px;
}

.cvEntry {
  padding-bottom: 18px;
  border-bottom: 1px solid #e0ddd3;
}

.cvEntry:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.entryHeader,
.compactEntry {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.cvEntry h4 {
  margin-bottom: 2px;
  color: #272b2d;
  font-size: 14px;
}

.cvEntry p {
  margin-bottom: 0;
  color: #696d6d;
  font-size: 12px;
}

.entryMeta {
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: #7f817b;
  font-size: 10px;
  text-align: right;
}

.cvEntry ul,
.simpleList {
  margin: 10px 0 0;
  padding-left: 18px;
}

.cvEntry li,
.simpleList li {
  margin-bottom: 5px;
  font-size: 12px;
  line-height: 1.55;
}

.simpleList {
  margin-top: 0;
}

.letterPaper {
  padding: 34px 42px 38px;
  border-top: 4px solid #5b6875;
}

.letterTop {
  padding-bottom: 15px;
  margin-bottom: 20px;
  border-bottom: 1px solid #d8d4c8;
}

.letterTop h2 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 25px;
  font-weight: 500;
}

.letterTop .eyebrow {
  color: #7f6738;
}

.letterText p {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.72;
}

.letterText p:last-child {
  margin-bottom: 0;
}

.offerSection {
  max-width: 900px;
  margin: 28px auto 0;
  padding: 22px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 22px;
  border: 1px solid rgba(216, 189, 131, 0.16);
  border-radius: 16px;
  background: rgba(216, 189, 131, 0.045);
}

.offerSection h2 {
  margin-bottom: 4px;
  font-size: 20px;
}

.offerSection > div > p:last-child {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 12px;
}

.offerPrice {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.offerPrice strong {
  color: var(--gold);
  font-size: 26px;
}

.offerPrice span {
  color: var(--muted);
  font-size: 10px;
}

footer {
  width: min(900px, calc(100% - 32px));
  margin: 0 auto;
  padding: 28px 0 34px;
  border-top: 1px solid var(--line);
  color: #687582;
  text-align: center;
  font-size: 11px;
}

@media (max-width: 760px) {
  .navBar {
    width: min(100% - 24px, 1080px);
    padding: 16px 0;
  }

  .pricePill {
    max-width: 168px;
    white-space: normal;
    text-align: right;
    line-height: 1.3;
  }

  .toolPage {
    width: min(100% - 24px, 900px);
    padding-top: 38px;
  }

  .intro h1 {
    font-size: 39px;
    letter-spacing: -1.4px;
  }

  .introCopy {
    font-size: 15px;
  }

  .modeSelector {
    grid-template-columns: 1fr;
  }

  .toolCard {
    padding: 20px;
  }

  .contactGrid {
    grid-template-columns: 1fr;
  }

  .fullInput {
    grid-column: auto;
  }

  .resultSection {
    margin-top: 45px;
  }

  .resultHeading {
    align-items: flex-start;
  }

  .readyBadge {
    display: none;
  }

  .insights {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .keywordsBlock {
    padding: 17px 0 0;
    border-left: 0;
    border-top: 1px solid var(--line);
  }

  .cvPaper {
    padding: 29px 24px 32px;
  }

  .cvTop {
    flex-direction: column;
    gap: 8px;
  }

  .contactLine {
    max-width: 100%;
    text-align: left;
  }

  .cvTop h2 {
    font-size: 27px;
  }

  .entryHeader,
  .compactEntry {
    flex-direction: column;
    gap: 6px;
  }

  .entryMeta {
    min-width: 0;
    align-items: flex-start;
    text-align: left;
  }

  .letterPaper {
    padding: 28px 24px 30px;
  }

  .offerSection {
    align-items: flex-start;
  }
}

@media (max-width: 460px) {
  .wordmark {
    font-size: 19px;
  }

  .wordmarkMark {
    width: 31px;
    height: 31px;
  }

  .intro h1 {
    font-size: 35px;
  }

  .toolCard {
    padding: 17px;
  }

  .offerSection {
    flex-direction: column;
  }

  .offerPrice {
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  * {
    transition: none !important;
  }
}
