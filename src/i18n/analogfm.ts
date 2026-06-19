export const analogfm: Record<string, string> = {
  // Navigation & landing (new keys for FM module)
  'nav.analogFm': 'Angle Modulation (FM/PM)',
  'landing.mod.analog-fm.title': 'Angle Modulation (FM/PM)',
  'landing.mod.analog-fm.desc':
    'Angle modulation: FM & PM waveforms, instantaneous frequency, Bessel sidebands, Carson bandwidth, and discriminator detection.',

  // Animation + panel selector (FM-specific)
  'analog.animation': 'Animation',
  'analog.fm.panel.select': 'Panel',

  // FM/PM Modulator panel
  'analog.fm.title': 'FM/PM Modulator',
  'analog.fm.mode': 'Modulation type',
  'analog.fm.mode.fm': 'Frequency modulation (FM)',
  'analog.fm.mode.pm': 'Phase modulation (PM)',
  'analog.fm.messageFreq': 'Message frequency fₘ',
  'analog.fm.carrierFreq': 'Carrier frequency fᶜ',
  'analog.fm.carrierAmp': 'Carrier amplitude Aᶜ',
  'analog.fm.modIndex': 'Modulation index β (FM) / kₚ (PM)',
  'analog.fm.instantFreq': 'Instantaneous frequency fᵢ(t)',
  'analog.fm.carson': 'Carson bandwidth B',
  'analog.fm.spectrum': 'Bessel sidebands (FM)',
  'analog.fm.timeDomain': 'Constant-envelope carrier',
  'analog.fm.sidebands': 'Significant sidebands',

  // Demodulation panel (FM-relevant methods)
  'analog.demod.title': 'Demodulation',
  'analog.demod.method': 'Demodulation method',
  'analog.demod.method.fmdiscrim': 'FM discriminator',
  'analog.demod.recovered': 'Recovered message',
  'analog.demod.original': 'Original message',
  'analog.demod.distortion': 'Detection distortion',
  'analog.demod.fidelity': 'Recovery fidelity',
  'analog.demod.faithful': 'Faithful',
  'analog.demod.distorted': 'Distorted',

  // Readouts
  'analog.readout.bandwidth': 'Bandwidth',
  'analog.readout.peakFreq': 'Peak frequency',
  'analog.readout.power': 'Power',
  'analog.readout.efficiency': 'Efficiency',
  'analog.readout.distortion': 'Distortion',

  // Theory box (FM theory)
  'analog.theory.title': 'Analog Modulation Theory',
  'analog.theory.fm': 'FM: u(t) = Aᶜ·cos(2πfᶜt + β·sin(2πfₘt))',
  'analog.theory.carson': 'Carson bandwidth: B = 2(β+1)fₘ',

  // --- Chapter 4 rebuild: 4-tab shell (Representation · Spectrum · Mod/Demod · FM Radio) ---
  'analog.fm.tab.ariaLabel': 'Angle modulation sections',
  'analog.fm.tab.repr': 'Representation',
  'analog.fm.tab.spectrum': 'Spectrum',
  'analog.fm.tab.moddemod': 'Modulators & Demodulators',
  'analog.fm.tab.radio': 'FM Radio',

  // Sub-tabs
  'analog.fm.sub.ariaLabel': 'Modulation type',
  'analog.fm.sub.fm': 'FM',
  'analog.fm.sub.pm': 'PM',
  'analog.fm.sub.msgAriaLabel': 'Message type',
  'analog.fm.sub.tone': 'Sinusoidal message',
  'analog.fm.sub.arbitrary': 'Arbitrary message',

  // Shared controls
  'analog.fm.parameters': 'Parameters',
  'analog.fm.reset': 'Reset',
  'analog.fm.msgFreq': 'Message frequency $f_m$',
  'analog.fm.tone1Freq': 'Tone 1 frequency $f_1$',
  'analog.fm.tone2Freq': 'Tone 2 frequency $f_2$',
  'analog.fm.tone3Freq': 'Tone 3 frequency $f_3$',
  'analog.fm.carrierFreqKHz': 'Carrier frequency $f_c$',
  'analog.fm.carrierAmpV': 'Carrier amplitude $A_c$',
  'analog.fm.betaFm': 'Modulation index $\\beta$',
  'analog.fm.betaPm': 'Phase deviation index $\\beta_p$',
  'analog.fm.msgBandwidth': 'Message bandwidth $W$',
  'analog.fm.deltaFkHz': 'Peak deviation $\\Delta f$',

  // Representation tab — readouts
  'analog.fm.readout.beta': 'Mod. index $\\beta$',
  'analog.fm.readout.deltaF': 'Peak deviation $\\Delta f$',
  'analog.fm.readout.regime': 'Regime',
  'analog.fm.readout.fiRange': '$f_i$ range',
  'analog.fm.regime.nbfm': 'Narrowband (NBFM)',
  'analog.fm.regime.wbfm': 'Wideband (WBFM)',

  // Representation tab — plot titles + traces
  'analog.fm.plot.message': 'Message $m(t)$',
  'analog.fm.plot.signalFm': 'FM signal $u(t)$',
  'analog.fm.plot.signalPm': 'PM signal $u(t)$',
  'analog.fm.plot.instFreq': 'Instantaneous frequency $f_i(t)$',
  'analog.fm.plot.instPhase': 'Instantaneous phase $\\theta(t)$',
  'analog.fm.trace.exact': 'Exact',
  'analog.fm.trace.nbfm': 'NBFM approx.',

  // Spectrum tab — readouts + plots
  'analog.fm.spectrum.carson': 'Carson bandwidth $B_c$',
  'analog.fm.spectrum.nSidebands': 'Significant sidebands',
  'analog.fm.spectrum.plotBessel': 'Line spectrum $A_c\\,|J_n(\\beta)|$',
  'analog.fm.spectrum.plotFft': 'Magnitude spectrum $|U(f)|$',
  'analog.fm.spectrum.trace.carson': 'Carson band',
  'analog.fm.spectrum.carsonNote':
    'The dashed band is Carson’s bandwidth, which holds about $98\\%$ of the signal power. It is set by the peak deviation $\\Delta f$, not by where the visible energy starts — an FM spectrum is theoretically infinite, so faint sidebands just beyond the band are normal, not an error.',
  'analog.fm.spectrum.besselPanel': 'Bessel functions (Fig. 4.13)',
  'analog.fm.spectrum.besselCurves': '$J_n(\\beta)$ for $n = 0, 1, \\dots, 7$',

  // Interim placeholders for tabs built in later phases
  'analog.fm.placeholder.moddemod': 'Modulators & Demodulators — the real discriminator, balanced detector and PLL arrive in Phase 2.',
  'analog.fm.placeholder.radio': 'FM Radio broadcasting — superheterodyne receiver, stereo multiplexing and pre/de-emphasis arrive in Phase 3.',

  // FM Radio tab — Phase 3 (§4.4)
  'analog.fm.radio.subtab.ariaLabel': 'FM Radio sections',
  'analog.fm.radio.subtab.emphasis': 'Pre/De-emphasis',
  'analog.fm.radio.subtab.stereo': 'Stereo Multiplexing',
  'analog.fm.radio.subtab.superhet': 'Superheterodyne',

  // Pre/De-emphasis sub-tab
  'analog.fm.radio.emphasis.panel': 'Filter Parameters (§6.2.2)',
  'analog.fm.radio.emphasis.f1': 'Corner frequency $f_1$',
  'analog.fm.radio.emphasis.snrGain': 'SNR improvement',
  'analog.fm.radio.emphasis.plot': 'Frequency Response $|H(f)|$ (dB)',
  'analog.fm.radio.emphasis.trace.pe': 'Pre-emphasis $H_{pe}(f)$',
  'analog.fm.radio.emphasis.trace.de': 'De-emphasis $H_{de}(f)$',

  // Stereo Multiplexing sub-tab
  'analog.fm.radio.stereo.panel': 'Stereo Parameters (§4.4.2)',
  'analog.fm.radio.stereo.balance': 'L/R balance',
  'analog.fm.radio.stereo.plot': 'Composite Baseband Spectrum',
  'analog.fm.radio.stereo.trace.composite': 'Composite $s_{BB}(f)$',
  'analog.fm.radio.stereo.left': 'Full left',
  'analog.fm.radio.stereo.right': 'Full right',
  'analog.fm.radio.stereo.mono': 'Mono (L=R)',

  // Superheterodyne sub-tab
  'analog.fm.radio.superhet.panel': 'Receiver Parameters (§4.4.1)',
  'analog.fm.radio.superhet.rfFreq': 'RF frequency $f_{RF}$',
  'analog.fm.radio.superhet.readout.rf': 'RF',
  'analog.fm.radio.superhet.readout.lo': 'LO',
  'analog.fm.radio.superhet.readout.if': 'IF',
  'analog.fm.radio.superhet.diagram': 'Superheterodyne Receiver Block Diagram',

  // Mod/Demod tab — Phase 2 (§4.3)
  'analog.fm.moddemod.noise': 'Add AWGN noise',
  'analog.fm.moddemod.snrDb': 'Input SNR',
  'analog.fm.moddemod.readout.snr': 'Output SNR',
  'analog.fm.moddemod.subtab.ariaLabel': 'FM demodulator type',
  'analog.fm.moddemod.subtab.discriminator': 'Discriminator (§4.3.2)',
  'analog.fm.moddemod.subtab.pll': 'PLL (§4.3.3)',
  'analog.fm.moddemod.panel.modulator': 'FM Modulators — Direct FM & Armstrong (§4.3)',
  'analog.fm.moddemod.panel.discrim': 'FM Discriminator Simulation (§4.3.2)',
  'analog.fm.moddemod.panel.discriminatorDiagram': 'FM Discriminator — block diagram (§4.3.2)',
  'analog.fm.moddemod.trace.original': 'Original $m(t)$',
  'analog.fm.moddemod.trace.recovered': 'Recovered $\\hat{m}(t)$',

  // PLL FM Demodulator (§4.3.3)
  'analog.fm.pll.parameters': 'PLL Parameters',
  'analog.fm.pll.loopBn': 'Loop bandwidth $B_n$',
  'analog.fm.pll.damping': 'Damping ratio $\\zeta$',
  'analog.fm.moddemod.panel.pll': 'PLL FM Demodulator Simulation (§4.3.3)',
  'analog.fm.moddemod.panel.pllDiagram': 'PLL FM Demodulator — block diagram (§4.3.3, Fig. 4.14)',
  'analog.fm.moddemod.panel.pllPhaseError': 'Phase error convergence $e(t)$',
  'analog.fm.moddemod.trace.pllRecovered': 'PLL recovered $\\hat{m}(t)$',
  'analog.fm.moddemod.trace.phaseError': 'Phase error $e(t)$',
};
