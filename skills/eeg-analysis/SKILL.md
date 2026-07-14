---
name: eeg-analysis
description: MNE-Python workflow guide for EEG signal processing and analysis — preprocessing (load EDF/BDF/FIF/SET/VHDR/CNT, rereference, filter, ICA), ERP, PSD/band power, time-frequency (STFT/Morlet/Hilbert), and cluster-based group statistics. Use when the user asks to preprocess EEG data, compute ERP/PSD/time-frequency, run group-level statistics on EEG, or generate EEG analysis scripts. Requires Python ≥ 3.10 + MNE-Python (`pip install mne mne[hdf5]`).
---

# eeg-analysis — MNE-Python EEG Workflow Guide

This skill guides the agent through MNE-Python EEG analysis. It produces Python scripts that the user runs locally or in Docker/Modal/RunPod (see the `docker`, `modal-compute`, `runpod-compute` skills for remote execution).

## Setup

The user must have Python ≥ 3.10 and MNE installed:

```bash
pip install mne mne[hdf5]
```

For heavy analysis (large datasets, ICA on >64 channels), recommend the Docker image `mne/mne-python:latest` or Modal remote execution.

## File loading by extension

| Extension | Reader |
|---|---|
| `.edf` | `mne.io.read_raw_edf` |
| `.bdf` | `mne.io.read_raw_bdf` |
| `.fif` | `mne.io.read_raw_fif` |
| `.set` (+`.fdt`) | `mne.io.read_raw_eeglab` |
| `.vhdr` (+`.eeg`+`.vmrk`) | `mne.io.read_raw_brainvision` |
| `.cnt` | `mne.io.read_raw_cnt` |

```python
import mne
raw = mne.io.read_raw_edf("subject01.edf", preload=True)
```

## 1. Preprocessing

### Rereference
```python
raw.set_eeg_reference(ref_channels="average")  # or "laplacian", or [] for no rereference
```

### Filter
```python
raw.filter(l_freq=0.5, h_freq=45)       # bandpass
raw.notch_filter(freqs=[50, 60])        # powerline
```

### Downsample (after ICA to avoid aliasing artifacts)
```python
raw.resample(sfreq=200)
```

### ICA artifact removal
```python
from mne.preprocessing import ICA, create_eog_epoch
ica = ICA(n_components=15, method="fastica", random_state=42)
ica.fit(raw.copy().filter(l_freq=1, h_freq=None))
eog_epochs = create_eog_epoch(raw)
eog_indices, eog_scores = ica.find_bads_eog(eog_epochs)
ica.exclude = eog_indices
raw_clean = ica.apply(raw.copy())
```

### Mark bad channels
```python
raw.info["bads"] = ["Fp1", "F7"]  # manual, or use mne.preprocessing.peak_detection
```

## 2. Time-domain analysis (ERP/ERF)

```python
events = mne.make_fixed_length_events(raw, duration=2.0)  # or extract from STIM channel
epochs = mne.Epochs(raw, events, event_id={"trial": 1}, tmin=-0.2, tmax=0.8, baseline=(None, 0))
evoked = epochs.average()
evoked.plot_joint()  # waveform + topography
```

## 3. Frequency-domain analysis

### PSD
```python
psd = raw.compute_psd(method="welch", fmin=0.5, fmax=45)
psd.plot()
```

### Band power
```python
bands = {"delta": (1, 4), "theta": (4, 8), "alpha": (8, 13),
         "beta": (13, 30), "gamma": (30, 45)}
import numpy as np
psd_data = psd.get_data()
freqs = psd.freqs
band_power = {}
for name, (fmin, fmax) in bands.items():
    mask = (freqs >= fmin) & (freqs <= fmax)
    band_power[name] = psd_data[:, mask].mean(axis=1)  # per channel
```

## 4. Time-frequency analysis

### Morlet wavelet
```python
from mne.time_frequency import tfr_morlet
freqs = np.logspace(np.log10(4), np.log10(30), num=20)
n_cycles = freqs / 2.
power, itc = tfr_morlet(epochs, freqs=freqs, n_cycles=n_cycles, return_itc=True)
power.plot([0])  # channel index 0
```

### Hilbert envelope
```python
raw_alpha = raw.copy().filter(l_freq=8, h_freq=13)
envelope = raw_alpha.apply_hilbert(envelope=True)
```

## 5. Group statistics

### Cluster-based permutation test
```python
from mne.stats import spatio_temporal_cluster_test
from mne.channels import find_ch_adjacency
adjacency, _ = find_ch_adjacency(epochs.info, "eeg")
T_obs, clusters, p_values, _ = spatio_temporal_cluster_test(
    [condition_a_epochs.get_data(), condition_b_epochs.get_data()],
    n_permutations=1000, tail=0, threshold=None, adjacency=adjacency)
```

### TFCE (threshold-free cluster enhancement)
```python
from mne.stats import threshold_free_cluster_enhancement
# Use with adjacency for spatio-temporal data
```

### Multiple comparison correction
```python
from mne.stats import fdr_correction
reject, p_corrected = fdr_correction(p_values, alpha=0.05)
```

## Output conventions (per AGENTS.md)

For slug `<slug>`:

- Figures: `outputs/<slug>/figures/*.png`
- Tables: `outputs/<slug>/tables/*.csv`
- Processed data: `outputs/<slug>/processed/*.fif`
- Provenance sidecar: `outputs/<slug>.provenance.md` — record MNE version, Python version, OS, key parameters (filter band, ICA components, random seed), original data source (dataset ID + URL), execution environment (local/Docker/Modal), verification status.

```python
import mne, sys, platform
provenance = f"""# Provenance

- MNE version: {mne.__version__}
- Python: {sys.version}
- OS: {platform.platform()}
- Filter: 0.5-45 Hz, notch 50/60 Hz
- ICA: fastica, n_components=15, random_state=42
- Source data: <dataset_id> (<url>)
- Execution: local
- Verification: unverified
"""
with open("outputs/<slug>.provenance.md", "w") as f:
    f.write(provenance)
```

## When to use this skill

- User asks to preprocess EEG data (EDF/BDF/FIF/SET/VHDR/CNT)
- User asks to compute ERP, PSD, band power, time-frequency
- User asks to run group statistics on EEG data
- User asks to generate EEG analysis scripts

## When NOT to use

- User wants EEG source localization or functional connectivity (not in this skill's scope — beyond B-level coverage)
- User wants EEG decoding/BCI/ML classification (use `ml-training-recipe` skill instead)
- User only wants to find EEG datasets (use the `science_database_search` tool with `source: "openneuro" | "dandi" | "physionet" | "tuheeg"`)
