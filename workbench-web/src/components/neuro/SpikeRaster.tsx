// Spike raster 预览组件 · Nervefeyn Workbench
// JS 生成 14×80 tick 矩阵,模拟多通道神经元放电

import { useEffect, useRef } from "react";

interface SpikeRasterProps {
	className?: string;
	height?: number;
	rows?: number;
	cols?: number;
	fireRate?: number;
}

export function SpikeRaster({
	className = "raster-mini",
	height = 64,
	rows = 14,
	cols = 80,
	fireRate = 0.16,
}: SpikeRasterProps) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		let html = "";
		for (let i = 0; i < rows; i++) {
			html += '<div class="row">';
			for (let j = 0; j < cols; j++) {
				const fire = Math.random() < fireRate;
				const style = fire
					? `background:#d4a05a;opacity:${(0.4 + Math.random() * 0.6).toFixed(2)}`
					: "background:#1a1a1a";
				html += `<span class="tick" style="${style}"></span>`;
			}
			html += "</div>";
		}
		el.innerHTML = html;
	}, [rows, cols, fireRate]);

	return <div ref={ref} className={`np-viz ${className}`} style={{ height }} />;
}
