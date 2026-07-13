// 连接体预览组件 · Nervefeyn Workbench
// SVG 节点连线,模拟 84 区脑网络

interface ConnectomePreviewProps {
	className?: string;
	height?: number;
}

export function ConnectomePreview({ className = "conn-mini", height = 64 }: ConnectomePreviewProps) {
	return (
		<div className={`np-viz ${className}`} style={{ height }}>
			<svg viewBox="0 0 100 64">
				<g stroke="#d4a05a" strokeWidth="0.4" opacity="0.6" fill="none">
					<line x1="20" y1="32" x2="50" y2="16" />
					<line x1="20" y1="32" x2="50" y2="48" />
					<line x1="20" y1="32" x2="80" y2="32" />
					<line x1="50" y1="16" x2="80" y2="32" />
					<line x1="50" y1="48" x2="80" y2="32" />
					<line x1="50" y1="16" x2="50" y2="48" />
					<line x1="50" y1="32" x2="80" y2="16" />
					<line x1="50" y1="32" x2="80" y2="48" />
				</g>
				<g fill="#d4a05a">
					<circle cx="20" cy="32" r="2" />
					<circle cx="50" cy="16" r="2" />
					<circle cx="50" cy="32" r="2" />
					<circle cx="50" cy="48" r="2" />
					<circle cx="80" cy="32" r="2" />
					<circle cx="80" cy="16" r="1.5" />
					<circle cx="80" cy="48" r="1.5" />
				</g>
			</svg>
		</div>
	);
}
