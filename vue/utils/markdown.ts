/**
 * 简单的 Markdown 转 HTML 转换器（小规模项目用途）
 * 支持：标题（#...）、无序/有序列表、代码块、行内代码、粗体/斜体、链接、段落
 * 注意：此实现为轻量级解析，非完整 CommonMark 实现，仅用于简单展示与快速渲染。
 */

export function mdToHtml(md: string): string {
	if (!md) return '';

	const escapeHtml = (s: string) =>
		s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

	const lines = md.replace(/\r\n/g, '\n').split('\n');
	let out: string[] = [];
	let inCode = false;
	let codeBuffer: string[] = [];
	let listType: null | 'ul' | 'ol' = null;

	const closeList = () => {
		if (listType) {
			out.push(listType === 'ul' ? '</ul>' : '</ol>');
			listType = null;
		}
	};

	const processInline = (text: string) => {
		let t = escapeHtml(text);
		// 行内代码：先处理，内容已被转义
		t = t.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
		// 链接
		t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
			const safeHref = escapeHtml(href);
			return `<a href="${safeHref}" target="_blank" rel="noopener">${label}</a>`;
		});
		// 粗体 **text** 或 __text__
		t = t.replace(/(\*\*|__)(.*?)\1/g, (_m, _p, content) => `<strong>${content}</strong>`);
		// 斜体 *text* 或 _text_
		t = t.replace(/(\*|_)(.*?)\1/g, (_m, _p, content) => `<em>${content}</em>`);
		return t;
	};

	for (const raw of lines) {
		const line = raw.replace(/\t/g, '    ');

		// 代码块开始/结束
		if (line.trim().startsWith('```')) {
			if (inCode) {
				// 关闭代码块
				const codeHtml = escapeHtml(codeBuffer.join('\n'));
				out.push(`<pre><code>${codeHtml}</code></pre>`);
				codeBuffer = [];
				inCode = false;
			} else {
				inCode = true;
				codeBuffer = [];
			}
			continue;
		}

		if (inCode) {
			codeBuffer.push(line);
			continue;
		}

		// 空行：关闭列表并产生段落断开
		if (line.trim() === '') {
			closeList();
			out.push('');
			continue;
		}

		// 分割线 —— 支持 '---'、'***'、'___'
		const hrMatch = line.match(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/);
		if (hrMatch) {
			closeList();
			out.push('<hr/>');
			continue;
		}

		// 标题
		const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
		if (hMatch) {
			closeList();
			const level = hMatch[1].length;
			out.push(`<h${level}>${processInline(hMatch[2].trim())}</h${level}>`);
			continue;
		}

		// 有序列表
		const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
		if (olMatch) {
			if (listType !== 'ol') {
				closeList();
				out.push('<ol>');
				listType = 'ol';
			}
			out.push(`<li>${processInline(olMatch[1].trim())}</li>`);
			continue;
		}

		// 无序列表
		const ulMatch = line.match(/^\s*[-\*+]\s+(.*)$/);
		if (ulMatch) {
			if (listType !== 'ul') {
				closeList();
				out.push('<ul>');
				listType = 'ul';
			}
			out.push(`<li>${processInline(ulMatch[1].trim())}</li>`);
			continue;
		}

		// 普通段落（单行）
		closeList();
		out.push(`<p>${processInline(line.trim())}</p>`);
	}

	// 结尾收尾
	if (inCode) {
		// 若未关闭代码块则将缓冲作为代码输出
		const codeHtml = escapeHtml(codeBuffer.join('\n'));
		out.push(`<pre><code>${codeHtml}</code></pre>`);
	}
	closeList();

	// 合并输出，保留空行为段落间隔
	return out.join('\n');
}

export default mdToHtml;
