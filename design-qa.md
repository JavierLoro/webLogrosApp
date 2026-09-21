# Design QA — UI-A1 acceso público · iteración 0

## Comparison target

- Source visual truth: `apps/frontend/LockerBoard-marca/ReferenciasPaginas/_compartidas/acceso-onboarding-desktop-v1.png`.
- Source pixels: `1536 × 1024`; relevant interiors are panels 1/2, approximately `476 × 431 px` each.
- Implementation screenshots:
  - `docs/ui-workstream/evidence/UI-A1/login-desktop.png` — `1440 × 1024`.
  - `docs/ui-workstream/evidence/UI-A1/register-desktop.png` — `1440 × 1024`.
  - `docs/ui-workstream/evidence/UI-A1/login-tablet.png` — `768 × 1024`.
  - `docs/ui-workstream/evidence/UI-A1/register-tablet.png` — `768 × 1024`.
  - `docs/ui-workstream/evidence/UI-A1/login-mobile.png` — `390 × 844`, invalid/blank capture.
  - `docs/ui-workstream/evidence/UI-A1/register-mobile.png` — `390 × 844`.
  - error-state screenshots listed below.
- CSS viewport/density: screenshots equal their reported CSS viewport at 1× density. Desktop target is a `960 × 800 CSS px` frame within `1440 × 1024`.
- Normalization: compare the source panel interior to the app frame, not the six-panel board. Approximate source→desktop scale is `2.02×` horizontal and `1.86×` vertical. Tablet/mobile are responsive inferences because no mobile source exists.
- State: empty login/register forms, plus login server error and registration password mismatch.

Source and implementation were opened together in one original-resolution comparison input before judgment. Focused crops were not needed: titles, frame division, form controls and responsive edges are readable in the original PNGs. No screenshots were cropped, regenerated or edited.

## Findings

- [P1] Aside headline block is anchored too low.
  - Location: `AuthLayout` lateral panel, desktop and tablet.
  - Evidence: source-normalized headline begins roughly 140–205 px from the panel top; implementation begins about 326 px for login and 393 px for register. The shorter register headline falls lower because the block is bottom-aligned.
  - Impact: major vertical-composition drift; the top half feels empty and the intended logo→message→media rhythm is reversed.
  - Fix: replace the headline wrapper's bottom anchoring with a stable top/percentage position. Aim for ~150–210 px from the top of an 800 px desktop aside; keep logo top, metadata bottom, and 50/50 geometry unchanged.

- [P2] Login H1 wraps at desktop/tablet while the source and register pattern stay on one line.
  - Location: `AuthFormHeader` on `/login`.
  - Evidence: `Bienvenido de nuevo` renders in two lines and measures 73.44 px high at 1440; source panel 1 uses one line.
  - Impact: login becomes optically heavier than register and shifts the form rhythm.
  - Fix: cap the tablet/desktop login H1 near 32 px or otherwise provide enough inline measure; retain mobile wrapping when necessary.

## Evidence blocker

- `login-mobile.png` and `register-error-mobile.png` are invalid captures. Both are near-empty light canvases and do not show the app.
- This does not prove an implementation P0, because `register-mobile.png`, tablet evidence and runtime measurements are healthy. It does block visual handoff for login mobile and the mobile registration-error state.
- Required action: recapture those exact states, inspect the saved PNGs, and rerun comparison.

## Required fidelity surfaces

- Fonts and typography: display/body split, weights and contrast are coherent; P2 remains for login H1 wrap. Aside typography is intentionally token-based rather than handwritten, but its placement is still actionable P1.
- Spacing and layout rhythm: 960×800 desktop frame, 50/50 split, borders, radii, control height and form padding pass. Aside vertical rhythm fails P1.
- Colors and visual tokens: deep blue-black, petroleum surfaces, cool borders and red accent match the source intent; no actionable drift.
- Image quality and asset fidelity: photography is contractually excluded; CSS placeholder geometry is acceptable. Existing LockerBoard logo is an approved substitution. No banned fake photo/icon approximation is present.
- Copy and content: approved route-specific titles, subtitles, labels, CTAs and footer navigation are present. Missing Name/OAuth/remember/recovery/legal content is intentionally excluded.
- Icons and controls: text Mostrar/Ocultar is an approved accessible adaptation. No required icon mismatch remains.
- Responsiveness: valid register mobile and both tablet captures reflow cleanly with no visible overflow. Login mobile remains unverified because its screenshot is invalid.
- Accessibility visible from evidence: labels, 48 px controls, error contrast and link affordances look sound. Keyboard/focus/AT claims rely on functional QA and are not inferred from pixels.

## States and interactions reported by browser QA

- Navigation login↔register: PASS.
- Native required/email validation: PASS.
- Password mismatch alert/no submit path: PASS by runtime + structural check.
- Mostrar/Ocultar and independent confirmation field: PASS.
- Real login error, retained values and button recovery: PASS.
- Real PLAYER and TEAM_ADMIN login/redirects: PASS.
- Console: no observed JS error; one pre-existing Next scroll-behavior warning.
- Not fully runtime-measured: successful registration, double-submit race, network/500 states.

## Open questions

- Are the two light PNGs capture failures or a transient paint issue? Current visual evidence cannot distinguish them; QA measurements alone do not replace visible captures.

## Implementation checklist

1. Move the shared aside message block upward without changing the frame, 50/50 split or placeholder.
2. Keep the login H1 to one line at tablet/desktop.
3. Recapture login mobile empty and register mobile mismatch; open both PNGs before handoff.
4. Repeat full-view comparison at 1440, 768 and 390.

## Comparison history

- Iteration 0: P1 aside vertical placement, P2 login heading wrap, and two invalid mobile-state captures. No implementation fixes have yet been evaluated.

## Follow-up polish

- The small Next development indicator is runtime chrome and is excluded from app fidelity judgment.

final result: blocked
