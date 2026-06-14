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
};
