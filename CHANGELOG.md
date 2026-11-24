# Changelog

## [0.3.1](https://github.com/perenstrom/sjung/compare/v0.3.0...v0.3.1) (2026-11-24)


### Bug Fixes

* **pieces:** line up the piece name with the rest of its row (PER-485) ([#235](https://github.com/perenstrom/sjung/issues/235)) ([cdaab8f](https://github.com/perenstrom/sjung/commit/cdaab8f7526ec0abbcb4a0633b3fc14cbfa2c773))
* **player:** keep the Standard drum kit in the player's soundfont (PER-484) ([#233](https://github.com/perenstrom/sjung/issues/233)) ([b0f659f](https://github.com/perenstrom/sjung/commit/b0f659f44838f9c58af8b065e19a9f429a9b967c))

## [0.3.0](https://github.com/perenstrom/sjung/compare/v0.2.0...v0.3.0) (2026-11-24)


### Features

* **app:** show the running version in the sidebar and in Feedback emails (PER-453) ([#208](https://github.com/perenstrom/sjung/issues/208)) ([59911cd](https://github.com/perenstrom/sjung/commit/59911cdcc7eb8c2fa71045834f89a3d5c1991a76))
* **content:** link Pieces, Set lists, People, Files and Announcements by Slug (PER-481) ([#230](https://github.com/perenstrom/sjung/issues/230)) ([c8753c0](https://github.com/perenstrom/sjung/commit/c8753c012ecb61f03da367ec4f5cf1b2feff330a))
* **files:** accept MP3, M4A/AAC and WAV uploads, recognised by file extension (PER-466) ([#213](https://github.com/perenstrom/sjung/issues/213)) ([846156b](https://github.com/perenstrom/sjung/commit/846156b43fd836171f0c6a823927ca35d4f2e213))
* **files:** accept MuseScore uploads and convert them for the player (PER-478) ([#226](https://github.com/perenstrom/sjung/issues/226)) ([0674352](https://github.com/perenstrom/sjung/commit/0674352a3dfd9f0da073e8b2a8f7220b58f09200))
* **files:** let Manage content retry a failed MuseScore conversion (PER-479) ([#227](https://github.com/perenstrom/sjung/issues/227)) ([73e1160](https://github.com/perenstrom/sjung/commit/73e11609e495b5b03a038d83bcfc4577f46788a3))
* **operators:** give Operators a Group overview with each Group's size and activity (PER-452) ([#204](https://github.com/perenstrom/sjung/issues/204)) ([aae45ae](https://github.com/perenstrom/sjung/commit/aae45aedc1462a7377cdf339457ef40f3e3a08f0))
* **people:** give each Person a page listing the Pieces they are credited on (PER-420) ([#200](https://github.com/perenstrom/sjung/issues/200)) ([600eb3d](https://github.com/perenstrom/sjung/commit/600eb3d0254bceecbe7955f8c3ed9bbece4f6cf7))
* **people:** let content managers rename and delete People (PER-421) ([#201](https://github.com/perenstrom/sjung/issues/201)) ([a65cab8](https://github.com/perenstrom/sjung/commit/a65cab85ff9381e0e3a847bd264e95326d26a475))
* **pieces:** sort a Piece's Files and Links alphabetically within each Category (PER-451) ([#206](https://github.com/perenstrom/sjung/issues/206)) ([39be449](https://github.com/perenstrom/sjung/commit/39be4492578092d67f5dd3b933f783395c9c1293))
* **player:** build the trimmed player soundfont as SF3 (PER-470) ([#217](https://github.com/perenstrom/sjung/issues/217)) ([b9dfd4a](https://github.com/perenstrom/sjung/commit/b9dfd4ae147bad77931deaff999bb4ba440b9452))
* **player:** fix up choir MusicXML when it loads (PER-474) ([#223](https://github.com/perenstrom/sjung/issues/223)) ([f38cbb9](https://github.com/perenstrom/sjung/commit/f38cbb99e7d6e06ed1e445d2bf6c7bed87df10db))
* **player:** give each voice on a shared staff its own part (PER-475) ([#224](https://github.com/perenstrom/sjung/issues/224)) ([774eddd](https://github.com/perenstrom/sjung/commit/774eddd090055c667726b9c319654e740d3fa23a))
* **player:** mark and label Passages by bar wherever a File has bars (PER-482) ([#231](https://github.com/perenstrom/sjung/issues/231)) ([96e45ae](https://github.com/perenstrom/sjung/commit/96e45ae97552cab1fbbdfbf0764f5a3f8894a5f9))
* **player:** mix the parts of a MIDI File in Stämmor (PER-472) ([#221](https://github.com/perenstrom/sjung/issues/221)) ([2e48ed7](https://github.com/perenstrom/sjung/commit/2e48ed7d6d8d4333923c7873fca61b449343eb49))
* **player:** open the player from a Set list piece (PER-468) ([#215](https://github.com/perenstrom/sjung/issues/215)) ([30e4da3](https://github.com/perenstrom/sjung/commit/30e4da3401e7e6fa9f873b032363354186f4743e))
* **player:** play a MIDI File in the player (PER-471) ([#218](https://github.com/perenstrom/sjung/issues/218)) ([a5df147](https://github.com/perenstrom/sjung/commit/a5df147879f1abaae43eb75e0cc441404991287f))
* **player:** play an audio File in the player, phone layout (PER-467) ([#214](https://github.com/perenstrom/sjung/issues/214)) ([e9d4bf0](https://github.com/perenstrom/sjung/commit/e9d4bf09315f8f2148959e5ec8857e44b1193174))
* **player:** show and play a MusicXML File with alphaTab (PER-473) ([#222](https://github.com/perenstrom/sjung/issues/222)) ([d110075](https://github.com/perenstrom/sjung/commit/d11007575f37951f24f8b8c451fa9bb2eb0eb66a))
* **player:** wide layout and keyboard shortcuts on desktop (PER-469) ([#216](https://github.com/perenstrom/sjung/issues/216)) ([2c1ea04](https://github.com/perenstrom/sjung/commit/2c1ea04abb4be01588cef09e665fa7344e046808))
* **seo:** keep search engines out of private and token pages (PER-422) ([#199](https://github.com/perenstrom/sjung/issues/199)) ([58302e9](https://github.com/perenstrom/sjung/commit/58302e919a895cfeee119eabe41dc7d0b3446eb8))
* **setlists:** let a Set list be marked Current (Aktuell) and list Current ones first (PER-449) ([#207](https://github.com/perenstrom/sjung/issues/207)) ([934cfba](https://github.com/perenstrom/sjung/commit/934cfba4a2d32a342e6e567e2d1b71202c5acd73))
* **setlists:** pick the Piece to add with a searchable combobox (PER-200) ([#194](https://github.com/perenstrom/sjung/issues/194)) ([bdb28ea](https://github.com/perenstrom/sjung/commit/bdb28eadd79cdc748ddd11f45686660ada7d612d))
* **worker:** add the MuseScore converter worker container ([#225](https://github.com/perenstrom/sjung/issues/225)) ([9da7d63](https://github.com/perenstrom/sjung/commit/9da7d6304e52a1b15c4d72074daaecd62b5666e8))


### Bug Fixes

* **pieces:** call a Piece's Credits Upphovspersoner instead of Medverkande (PER-450) ([#205](https://github.com/perenstrom/sjung/issues/205)) ([22cd60d](https://github.com/perenstrom/sjung/commit/22cd60d4b323c437dd64b082c709c6bd39d73de7))
* **pieces:** keep Files and Links in one section with Category subheadings (PER-442) ([#198](https://github.com/perenstrom/sjung/issues/198)) ([b8fb100](https://github.com/perenstrom/sjung/commit/b8fb1007ec4968d3f16a5cf1158263b2b4714408))
* **pieces:** list each Set list once on the Piece page (PER-383) ([#196](https://github.com/perenstrom/sjung/issues/196)) ([853324f](https://github.com/perenstrom/sjung/commit/853324f1c0e7f89e387e1654076aedc21c44cd0a))
* **sidebar:** show the group switcher as an icon menu when the sidebar is collapsed (PER-444) ([#197](https://github.com/perenstrom/sjung/issues/197)) ([7a515d3](https://github.com/perenstrom/sjung/commit/7a515d385fb74dff008c829529cd830da92e1cac))

## [0.2.0](https://github.com/perenstrom/sjung/compare/v0.1.0...v0.2.0) (2026-11-19)


### Features

* **pieces:** add alternative names to pieces (PER-439) ([#188](https://github.com/perenstrom/sjung/issues/188)) ([70658ed](https://github.com/perenstrom/sjung/commit/70658ed8096d9ac84f34a7bbf67c4dddf9064017))
* **pieces:** give Files and Links an optional Category (PER-205) ([#189](https://github.com/perenstrom/sjung/issues/189)) ([c8be588](https://github.com/perenstrom/sjung/commit/c8be588a960ae66f918cc4e7dceafa7c5ed7bb71))
