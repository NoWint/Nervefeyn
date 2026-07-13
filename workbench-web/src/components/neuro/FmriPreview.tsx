// fMRI 切片预览组件 · Nervefeyn Workbench
// 径向渐变模拟 z=24 轴位脑切片

interface FmriPreviewProps {
	className?: string;
	height?: number;
}

export function FmriPreview({ className = "fmri-mini", height = 64 }: FmriPreviewProps) {
	return (
		<div className={`np-viz ${className}`} style={{ height }}>
			<div className="slice" />
		</div>
	);
}
