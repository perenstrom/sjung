# Mobile dialogs are pinned to the top and sized from the visual viewport

Status: accepted

Below the `md` breakpoint (768px), every dialog is a card pinned 16px below the top of the visible screen, with its height capped to the visible area. Its title row and action row stay put while the body between them scrolls. A small `visualViewport` listener (`hooks/use-visible-dialog-frame.ts`) writes the visible top and height into CSS variables that the dialog reads. The six form popovers (add credit, add link, add file, edit link, rename file, replace file) open as this same dialog on phones, and the person picker opens inline inside its dialog rather than in a nested popover. Desktop keeps the centred dialog and anchored popovers.

The reason is the on-screen keyboard. On iOS Safari and Chrome Android it shrinks only the visual viewport, not the layout viewport that `position: fixed`, `vh` and `dvh` follow. A centred dialog therefore keeps centring on the full screen and its lower half, often the field being typed in, ends up behind the keyboard. WebKit supports neither `interactive-widget=resizes-content` nor the VirtualKeyboard API, so on iPhone the only way to know where the keyboard starts is `visualViewport` JavaScript. Pinning to the top also keeps the start of the form next to the field you are typing in.

## Considered options

- **Keep centred dialogs, only cap their height.** Rejected: the dialog still centres on the layout viewport and slides under the keyboard on iPhone.
- **Bottom sheets sitting on top of the keyboard.** Rejected: they rely on library JavaScript for the keyboard. vaul is unmaintained (last release December 2024, with reported keyboard regressions), and shadcn's other option, Base UI, would mean migrating off Radix.
- **Full-screen dialogs on phones.** Rejected: too heavy for short confirmations, and every dialog should follow one rule.
- **Setting `viewport.interactiveWidget`.** Rejected: it only helps on Android, and would be a second keyboard behaviour to verify next to the `visualViewport` one that iPhone needs anyway.

## Consequences

- Anything touching dialogs, popovers, inputs or the keyboard must be checked on a real iPhone running current iOS. Simulators don't reliably reproduce input auto-zoom or the iOS 26 bugs after the keyboard closes.
- Inputs in mobile dialogs use a 16px font, so iOS Safari doesn't zoom in when they get focus.
- Decided on the mobile layout map (PER-340) after research in PER-368 and a prototype of four variants in PER-369; built in PER-376, PER-378 and PER-379.
