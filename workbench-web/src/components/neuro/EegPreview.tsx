// EEG 波形预览组件 · Nervefeyn Workbench
// SVG path 波形,模拟 Fz-Cz 通道 EEG 信号

interface EegPreviewProps {
	className?: string;
	height?: number;
}

export function EegPreview({ className = "eeg-mini", height = 64 }: EegPreviewProps) {
	return (
		<div className={`np-viz ${className}`} style={{ height }}>
			<svg viewBox={`0 0 200 ${height}`} preserveAspectRatio="none">
				<path
					d="M0,32 Q5,12 10,32 T20,32 Q25,50 30,32 T40,32 Q45,18 50,32 T60,32 Q65,46 70,32 T80,32 Q85,8 90,32 T100,32 Q105,54 110,32 T120,32 Q125,20 130,32 T140,32 Q145,44 150,32 T160,32 Q165,14 170,32 T180,32 Q185,40 190,32 T200,32"
					stroke="#d4a05a"
					strokeWidth="1"
					fill="none"
				/>
			</svg>
		</div>
	);
}
