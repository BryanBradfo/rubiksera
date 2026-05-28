// ─── English translations ───────────────────────────────────────────────
// Step text adapted from Victor Colin's methodology sheet (rubiks.pdf, in French).

export default {
  lang: 'en',
  langName: 'English',

  ui: {
    docTitle: "Solve a Rubik's cube — Victor Colin's method",
    title: "Solve a Rubik's cube",
    subtitle: "Beginner's method, step by step — Victor Colin's sheet",
    stepLabel: "Step",
    movesLabel: "Moves for this step",
    noMovesPlaceholder: "(no moves — no magic formula, it's up to you!)",
    btnPrev: "◀ Previous",
    btnPlay: "▶ Play",
    btnPause: "⏸ Pause",
    btnNext: "Next ▶",
    btnReset: "↻ Reset",
    speedLabel: "Speed",
    cubeHint: "Drag to rotate the cube · Scroll to zoom",
    creditLineHTML:
      "<strong>Method and reference sheet</strong> by " +
      "<a href='https://youtu.be/Leml4U4D1r8' target='_blank' rel='noopener'>Victor Colin</a>. " +
      "This page faithfully reproduces the " +
      "<a href='assets/rubiks.pdf' target='_blank' rel='noopener'><code>rubiks.pdf</code></a> sheet " +
      "as well as the " +
      "<a href='https://youtu.be/Leml4U4D1r8' target='_blank' rel='noopener'>video tutorial</a> " +
      "(« Résoudre le Rubik's Cube — solution complète pour débutants », in French).",
    creditThanks: "Thanks Victor for the tutorial!",
  },

  moves: {
    right: "Right",
    left: "Left",
    up: "Up",
    down: "Down",
    front: "Front",
    back: "Back",
    hidden: "(hidden)",
  },

  steps: [
    {
      title: "Make a cross (on the white face)",
      body: `
        <p>On the white face (the one with the white centre), you need to build a white cross
        <strong>by bringing up the edges that have white on them (don't worry about the corners)</strong>.
        You should obtain a cross like the one on the reference sheet.</p>

        <p>For this, <strong>there is no formula or miracle solution…</strong> you have to try and
        understand how the pieces move on your own. Making the cross quickly becomes instinctive and logical.</p>
      `,
    },
    {
      title: "Place the cross edges in the right spots",
      body: `
        <p>Following on from the cross, the edges must match the colour of the centre of each face.
        For example, the <strong>white/red</strong> edge must be placed on the red face (and not on the blue face).</p>

        <p><strong>Method:</strong> turn the white face until you find
        <strong>two well-placed edges</strong> (if all 4 are already in place, you don't need this step).</p>

        <div class="case">
          <div class="case-title">Case n°1</div>
          The two well-placed edges are next to each other. Hold a wrong edge in front of you
          and a correct one on your right, then apply the formula.
        </div>
        <div class="case">
          <div class="case-title">Case n°2</div>
          The two well-placed edges are on opposite faces. Hold a correct edge in front of you
          and apply the same formula but without the last move. You'll then end up in case n°1!
        </div>
      `,
    },
    {
      title: "Place the corners of the first layer",
      body: `
        <p>Find a corner with white on the bottom face and position it below the slot where it should go.
        For example, if you found the <strong>WHITE / BLUE / RED</strong> corner, turn the bottom face
        to move it under the slot circled on the reference sheet.</p>

        <p>Then, to lift it up, repeat the formula
        <code>R' D' R D</code> until the corner is solved.</p>

        <div class="case">
          <div class="case-title">Note</div>
          If the first layer isn't done but you can't find any more white corners on the bottom face,
          it means a white corner is already on the white face, but in the wrong spot or wrong orientation.
          <strong>Apply the formula once to bring it back down.</strong>
        </div>
      `,
    },
    {
      title: "Solve the second layer",
      body: `
        <p>From now on and until the end, <strong>keep the white face on the bottom.</strong></p>

        <p>To build the second layer, you need to place 4 edges between the second-layer centres.
        Look for an upside-down T like in the diagrams. You can turn the top face to find a T.
        Then look at the top of the T (if it's yellow, that T won't work, look for another one).</p>

        <div class="case">
          <div class="case-title">If the top of the T must go left</div>
          Apply the formula: <code>U' L' U L U F U' F'</code>
        </div>
        <div class="case">
          <div class="case-title">If the top of the T must go right</div>
          Apply the formula: <code>U R U' R' U' F' U F</code>
        </div>

        <div class="remark">
          <span class="remark-title">Note</span>
          <div class="remark-body">
            If your second layer isn't finished but you can't find any T without yellow on top,
            it means a second-layer edge is already inserted somewhere, but in the wrong spot
            or wrong orientation.<br><br>
            → Watch the tutorial at exactly 24 minutes 25 seconds.
          </div>
        </div>
      `,
    },
    {
      title: "Make a yellow cross",
      body: `
        <p><strong>For this step, the method explained here is different from the one shown in the video tutorial.</strong>
        This is the <strong>ONLY</strong> step where the explanations differ. For all the others,
        watching the tutorial helps you understand this methodology sheet better.</p>

        <div class="case">
          <div class="case-title">The line case</div>
          Apply the formula: <code>F R U R' U' F'</code>
        </div>
        <div class="case">
          <div class="case-title">The small "L" case</div>
          Apply the formula twice (the first one brings you back to the line case).
        </div>
        <div class="case">
          <div class="case-title">The dot</div>
          Apply the formula three times (the first one brings you to the small "L" case).
          Note: the small "L" obtained after the first formula isn't directly well placed,
          you have to put it in the top-left before chaining.
        </div>
      `,
    },
    {
      title: "Place the yellow cross edges in the right spots",
      body: `
        <p>Do <strong>EXACTLY THE SAME</strong> as in step 2.</p>
        <p>Turn the top face until you find two well-placed edges, then apply the formula.
        If the two well-placed edges are opposite, chain the same formula without the last move,
        and you'll find yourself in case n°1.</p>
      `,
    },
    {
      title: "Place the 4 last corners in the right spots",
      body: `
        <p>The goal is for each corner to be <strong>in the right spot</strong>. For example, the
        <strong>YELLOW / GREEN / RED</strong> corner must be placed between the green and red faces
        (regardless of its orientation: the corners don't need to be solved yet,
        they just need to be in the right spots).</p>

        <p><strong>Method:</strong> look for 1 of the 4 corners that is in the right spot — meaning
        the colours of the corner match the colours of the adjacent faces.</p>

        <div class="case">
          <div class="case-title">If one corner is in the right spot</div>
          Hold your cube so that this corner is in front of you on the right, and apply the formula
          (once or twice if the first time isn't enough):
          <code>U R U' L' U R' U' L</code>
        </div>
        <div class="case">
          <div class="case-title">If no corner is in the right spot</div>
          Apply the formula once "blindly" and then one corner will be in the right spot.
        </div>
      `,
    },
    {
      title: "Orient the 4 last corners to finish the cube",
      body: `
        <p><strong>Warning:</strong> if this is one of the first times you're doing this step,
        it is highly recommended to watch the entire explanation in the tutorial
        <strong>before starting.</strong></p>

        <p>To orient this corner, use the same formula as in step 3, repeating it
        until the corner is solved (until you see yellow appear on the top face):
        <code>R' D' R D</code></p>

        <p>When the corner is solved, <strong>turn ONLY the top face</strong>
        to bring another corner (which also needs solving) to the same spot.
        Then keep chaining the same formula until it's solved.</p>

        <p>Repeat this for each corner that needs to be oriented… and the cube is solved!</p>
      `,
    },
  ],
};
