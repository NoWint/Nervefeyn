"""Generate 4 EEG preview PNGs from an EEG file using MNE-Python.

Usage: python scripts/eeg-preview.py <input_file> <output_dir>

Outputs (in output_dir):
  - waveform.png  : first 30s, up to 30 channels, downsampled to 1000 pts/ch
  - psd.png       : PSD overlay, 0.5-100 Hz, log scale
  - topo.png      : alpha and beta band topography (skipped if no positions)
  - tfr.png       : Morlet time-frequency map for Cz (or first channel)
Also writes result.json with paths and any skip reasons.
"""
import sys
import json
from pathlib import Path

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"error": "usage", "message": "Usage: eeg-preview.py <input> <output_dir>"}))
        sys.exit(1)
    input_path = sys.argv[1]
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        import mne
    except ImportError:
        print(json.dumps({"error": "mne_not_found", "message": "Run: pip install mne"}))
        sys.exit(2)

    try:
        ext = Path(input_path).suffix.lower()
        if ext == ".edf":
            raw = mne.io.read_raw_edf(input_path, preload=True, verbose=False)
        elif ext == ".bdf":
            raw = mne.io.read_raw_bdf(input_path, preload=True, verbose=False)
        elif ext == ".fif":
            raw = mne.io.read_raw_fif(input_path, preload=True, verbose=False)
        elif ext == ".set":
            raw = mne.io.read_raw_eeglab(input_path, preload=True, verbose=False)
        elif ext == ".vhdr":
            raw = mne.io.read_raw_brainvision(input_path, preload=True, verbose=False)
        elif ext == ".cnt":
            raw = mne.io.read_raw_cnt(input_path, preload=True, verbose=False)
        else:
            print(json.dumps({"error": "unsupported_format", "message": f"Unsupported extension: {ext}"}))
            sys.exit(3)
    except Exception as e:
        print(json.dumps({"error": "parse_failed", "message": str(e)}))
        sys.exit(4)

    result = {"waveform": None, "psd": None, "topo": None, "tfr": None, "skipped": []}

    # 1. Waveform (first 30s, up to 30 channels, downsample to 1000 pts/ch)
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        sfreq = raw.info["sfreq"]
        n_samples = min(int(30 * sfreq), raw.n_times)
        n_channels = min(30, len(raw.ch_names))
        raw_crop = raw.copy().crop(0, n_samples / sfreq).pick(range(n_channels))
        ds_step = max(1, raw_crop.n_times // 1000)
        data, times = raw_crop.get_data(return_times=True)
        fig, axes = plt.subplots(n_channels, 1, figsize=(12, 2 * n_channels), sharex=True)
        if n_channels == 1:
            axes = [axes]
        for i, ax in enumerate(axes):
            ax.plot(times[::ds_step], data[i][::ds_step], linewidth=0.5)
            ax.set_ylabel(raw_crop.ch_names[i], rotation=0, fontsize=7, ha="right")
        axes[-1].set_xlabel("Time (s)")
        fig.suptitle(f"Waveform — first {n_samples / sfreq:.1f}s, {n_channels} channels")
        fig.tight_layout()
        waveform_path = output_dir / "waveform.png"
        fig.savefig(waveform_path, dpi=80)
        plt.close(fig)
        result["waveform"] = str(waveform_path)
    except Exception as e:
        result["skipped"].append({"figure": "waveform", "reason": str(e)})

    # 2. PSD (0.5-100 Hz, log scale)
    try:
        psd = raw.compute_psd(fmin=0.5, fmax=min(100, raw.info["sfreq"] / 2), verbose=False)
        fig = psd.plot(show=False, spatial_colors=False)
        psd_path = output_dir / "psd.png"
        fig.savefig(psd_path, dpi=80)
        plt.close(fig)
        result["psd"] = str(psd_path)
    except Exception as e:
        result["skipped"].append({"figure": "psd", "reason": str(e)})

    # 3. Topography (alpha + beta) — skipped if no channel positions
    try:
        if not mne.channels.make_eeg_layout(raw.info, verbose=False):
            raise RuntimeError("no channel positions")
        fig, axes = plt.subplots(1, 2, figsize=(10, 4))
        psd = raw.compute_psd(fmin=0.5, fmax=45, verbose=False)
        psd.plot_topomap(bands=[(8, 13, "Alpha"), (13, 30, "Beta")], axes=axes, show=False)
        topo_path = output_dir / "topo.png"
        fig.savefig(topo_path, dpi=80)
        plt.close(fig)
        result["topo"] = str(topo_path)
    except Exception as e:
        result["skipped"].append({"figure": "topo", "reason": str(e)})

    # 4. Time-frequency (Morlet, Cz or first channel)
    try:
        target_ch = "Cz" if "Cz" in raw.ch_names else raw.ch_names[0]
        raw_ch = raw.copy().pick(target_ch)
        sfreq = raw_ch.info["sfreq"]
        n_samples = min(int(10 * sfreq), raw_ch.n_times)  # 10s window
        raw_ch.crop(0, n_samples / sfreq)
        import numpy as np
        freqs = np.logspace(np.log10(4), np.log10(30), num=15)
        n_cycles = freqs / 2.
        power = mne.time_frequency.tfr_array_morlet(
            raw_ch.get_data()[np.newaxis], sfreq=sfreq, freqs=freqs, n_cycles=n_cycles, output="power", verbose=False)
        fig, ax = plt.subplots(figsize=(10, 5))
        im = ax.imshow(10 * np.log10(power[0, 0]),
                       aspect="auto", origin="lower",
                       extent=[0, n_samples / sfreq, freqs[0], freqs[-1]])
        ax.set_xlabel("Time (s)")
        ax.set_ylabel("Frequency (Hz)")
        ax.set_title(f"Time-Frequency — {target_ch}")
        fig.colorbar(im, ax=ax, label="Power (dB)")
        tfr_path = output_dir / "tfr.png"
        fig.savefig(tfr_path, dpi=80)
        plt.close(fig)
        result["tfr"] = str(tfr_path)
    except Exception as e:
        result["skipped"].append({"figure": "tfr", "reason": str(e)})

    print(json.dumps(result))
    sys.exit(0)

if __name__ == "__main__":
    main()
