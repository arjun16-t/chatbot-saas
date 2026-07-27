/**
 * Pipeline section interactivity. Clicking a flow-card enlarges it,
 * plays its sub-steps in as a ticking checklist, and highlights/scrolls
 * the matching entry in the left info column. Clicking a connector
 * jumps to the NEXT card in sequence (acts like a "continue" button).
 * Clicking an already-active card collapses it again.
 *
 * The traveling pulse dots on the connectors are pure CSS (infinite
 * keyframe) and run independently of any of this — the chain never
 * stops moving regardless of click state.
 */

document.addEventListener('DOMContentLoaded', () => {

  const flowCards = document.querySelectorAll('.flow-card');
  const connectors = document.querySelectorAll('.flow-connector');
  const infoItems = document.querySelectorAll('.info-item');

  if (!flowCards.length) {
    console.warn('pipeline-flow: no .flow-card elements found, aborting.');
    return;
  }

  let activeNode = null;

  function getCard(nodeId) {
    return document.querySelector(`.flow-card[data-node="${nodeId}"]`);
  }

  function getInfoItem(nodeId) {
    return document.querySelector(`.info-item[data-node="${nodeId}"]`);
  }

  function playSubsteps(card) {
    const substeps = card.querySelectorAll('.substep');
    substeps.forEach((s) => s.classList.remove('is-done'));
    gsap.to(substeps, {
      duration: 0,
      stagger: 0.18,
      onStart: function () {
        // `this.targets()[0]` is the specific substep this stagger tick
        // is currently applying to
        this.targets()[0].classList.add('is-done');
      },
    });
  }

  function activateNode(nodeId) {
    // Clicking the already-active node collapses it instead
    if (activeNode === nodeId) {
      deactivateAll();
      return;
    }

    deactivateAll();
    activeNode = nodeId;

    const card = getCard(nodeId);
    const info = getInfoItem(nodeId);

    if (card) {
      card.classList.add('is-active');
      playSubsteps(card);
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (info) {
      info.classList.add('is-active');
      info.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function deactivateAll() {
    activeNode = null;
    flowCards.forEach((c) => {
      c.classList.remove('is-active');
      c.querySelectorAll('.substep').forEach((s) => s.classList.remove('is-done'));
    });
    infoItems.forEach((i) => i.classList.remove('is-active'));
  }

  flowCards.forEach((card) => {
    card.addEventListener('click', () => activateNode(card.dataset.node));
  });

  connectors.forEach((connector) => {
    connector.addEventListener('click', () => {
      const nextId = connector.dataset.next;
      if (nextId) activateNode(nextId);
    });
  });

});