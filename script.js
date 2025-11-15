/**
 * 优化：将所有代码包裹在 DOMContentLoaded 事件中
 * 1. 确保 DOM 加载完成后再执行脚本
 * 2. 避免所有函数和变量污染全局作用域
 */
document.addEventListener('DOMContentLoaded', () => {
  // --- 1. UI & 工具函数 ---
  // [copyDomain, fallbackCopy, showToast, setStatus... 等函数保持不变，此处省略]
  // ...

  /**
   * 复制域名到剪贴板
   * @param {string} domain - 要复制的域名
   */
  function copyDomain(domain) {
    // 移除通配符前缀
    const cleanDomain = domain.replace(/^\*\./, '');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(cleanDomain)
        .then(() => {
          showToast('✅ 已复制: ' + cleanDomain);
        })
        .catch((err) => {
          fallbackCopy(cleanDomain);
        });
    } else {
      fallbackCopy(cleanDomain);
    }
  }

  /**
   * 降级复制方案
   * @param {string} text - 要复制的文本
   */
  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      showToast('✅ 已复制: ' + text);
    } catch (err) {
      showToast('❌ 复制失败，请手动复制');
    }

    document.body.removeChild(textArea);
  }

  /**
   * 显示 Toast 提示
   * @param {string} message - 提示信息
   */
  function showToast(message) {
    // 移除已存在的toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // 显示动画
    setTimeout(() => toast.classList.add('show'), 10);

    // 3秒后自动消失
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 设置网络卡片的状态指示器
   * @param {string} id - 元素 ID
   * @param {'loading' | 'success' | 'error'} status - 状态
   */
  function setStatus(id, status) {
    const indicator = document.getElementById(id);
    if (indicator) {
      indicator.className = 'status-indicator status-' + status;
    }
  }

  // --- 2. 页面功能初始化 ---

  /**
   * 初始化图片懒加载
   */
  function initLazyLoading() {
    const lazyImages = document.querySelectorAll('.lazy-image');
    if (!lazyImages.length) return;

    // 创建 Intersection Observer
    const imageObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');

            if (src) {
              // 创建新的图片对象来预加载
              const tempImg = new Image();

              // 图片加载完成后替换并添加过渡效果
              tempImg.onload = () => {
                img.src = src;
                img.removeAttribute('data-src');
                // 延迟添加loaded类以触发过渡动画
                setTimeout(() => {
                  img.classList.add('loaded');
                }, 50);
              };

              // 加载失败时也移除模糊效果
              tempImg.onerror = () => {
                img.classList.add('loaded');
              };

              // 开始加载图片
              tempImg.src = src;
            }

            // 停止观察已经加载的图片
            observer.unobserve(img);
          }
        });
      },
      {
        // 图片距离视口200px时开始加载
        rootMargin: '200px',
        threshold: 0.01,
      }
    );

    // 观察所有懒加载图片
    lazyImages.forEach((img) => {
      imageObserver.observe(img);
    });
  }

  /**
   * (已修改) 初始化主题功能
   * 仅负责处理“点击切换”和“系统主题变更”
   * 初始主题设置已移至 index.html 的 <head> 中
   */
  function initTheme() {
    const themeSwitcher = document.getElementById('theme-switcher');
    if (!themeSwitcher) return;

    // 1. 监听系统主题变化（仅当用户未手动设置时）
    if (window.matchMedia) {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', (e) => {
          // 只有在用户没有手动设置主题时才自动跟随系统
          if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
          }
        });
    }

    // 2. 主题切换点击事件
    themeSwitcher.addEventListener('click', () => {
      let theme = document.documentElement.getAttribute('data-theme');
      const newTheme = theme === 'dark' ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }

  // --- 3. 网络信息获取 ---
  // [fetchIpipData, fetchEdgeOneData, ... 等函数保持不变，此处省略]
  // ...

  /**
   * 获取国内测试数据 (遍历多个 API: speedtest.cn > ipipv.com > ipip.net)
   */
  async function fetchIpipData() {
    setStatus('status-ipip', 'loading');

    // 获取标题元素,用于动态更新 API 来源
    const titleElement = document.querySelector('#status-ipip').parentElement;

    // 定义 API 配置列表,按优先级排序
    const apiConfigs = [
      {
        name: 'speedtest.cn',
        url: 'https://api-v3.speedtest.cn/ip',
        parser: (data) => {
          if (data.code === 0 && data.data) {
            return {
              ip: data.data.ip || '未知',
              country: data.data.country || '未知',
              city: data.data.city || '未知',
            };
          }
          throw new Error('数据格式错误');
        },
      },
      {
        name: 'ipipv.com',
        url: 'https://myip.ipipv.com/',
        parser: (data) => {
          return {
            ip: data.Ip || '未知',
            country: data.Country || '未知',
            city: data.City || '未知',
          };
        },
      },
      {
        name: 'ipip.net',
        url: 'https://myip.ipip.net/json',
        parser: (data) => {
          if (data.ret === 'ok' && data.data) {
            return {
              ip: data.data.ip || '未知',
              country: data.data.location[0] || '未知',
              city: data.data.location[2] || '未知',
            };
          }
          throw new Error('数据格式错误');
        },
      },
    ];

    // 遍历 API 配置列表
    for (const config of apiConfigs) {
      try {
        // 添加时间戳参数避免缓存
        const timestamp = Date.now();
        const url =
          config.url +
          (config.url.includes('?') ? '&' : '?') +
          `t=${timestamp}`;
        const response = await fetch(url);
        const data = await response.json();

        // 使用对应的解析器解析数据
        const result = config.parser(data);

        // 更新页面显示
        document.getElementById('ipip-ip').textContent = result.ip;
        document.getElementById('ipip-country').textContent = result.country;
        document.getElementById('ipip-city').textContent = result.city;
        setStatus('status-ipip', 'success');

        // 更新标题显示当前使用的 API
        if (titleElement) {
          titleElement.innerHTML = `<span class="status-indicator" id="status-ipip"></span>国内测试（${config.name}）`;
          setStatus('status-ipip', 'success'); // 重新设置状态,因为 innerHTML 会清除
        }

        console.log(`使用 ${config.name} API 成功`);
        return; // 成功则返回,不再尝试其他 API
      } catch (error) {
        console.warn(`${config.name} 接口失败:`, error);
        // 继续尝试下一个 API
      }
    }

    // 所有 API 都失败
    document.getElementById('ipip-ip').innerHTML =
      '<span class="error">加载失败</span>';
    document.getElementById('ipip-country').textContent = '';
    document.getElementById('ipip-city').textContent = '';
    setStatus('status-ipip', 'error');
    console.error('所有国内测试 API 都失败');
  }

  /**
   * 获取 EdgeOne 数据
   */
  async function fetchEdgeOneData() {
    setStatus('status-edgeone', 'loading');
    try {
      // 添加时间戳参数避免缓存
      const response = await fetch(`https://api.ipapi.cmliussss.net`);
      const data = await response.json();

      document.getElementById('edgeone-ip').textContent = data.ip || '未知';
      document.getElementById('edgeone-country').textContent =
        data.location.country_code || '未知';
      document.getElementById('edgeone-city').textContent =
        `AS${data.asn.asn} ${data.asn.org}` || '未知';
      setStatus('status-edgeone', 'success');
    } catch (error) {
      document.getElementById('edgeone-ip').innerHTML =
        '<span class="error">加载失败</span>';
      document.getElementById('edgeone-country').textContent = '';
      document.getElementById('edgeone-city').textContent = '';
      setStatus('status-edgeone', 'error');
      console.error('EdgeOne 接口错误:', error);
    }
  }

  /**
   * 获取 CloudFlare 数据
   */
  async function fetchCloudFlareData() {
    setStatus('status-cf', 'loading');
    try {
      // 添加时间戳参数避免缓存
      const timestamp = Date.now();
      const response = await fetch(
        `https://cf.090227.xyz/ip.json?t=${timestamp}`
      );
      const data = await response.json();

      document.getElementById('cf-ip').textContent = data.ip || '未知';
      document.getElementById('cf-country').textContent =
        data.country || '未知';
      document.getElementById('cf-city').textContent = data.org || '未知';
      setStatus('status-cf', 'success');
    } catch (error) {
      document.getElementById('cf-ip').innerHTML =
        '<span class="error">加载失败</span>';
      document.getElementById('cf-country').textContent = '';
      document.getElementById('cf-city').textContent = '';
      setStatus('status-cf', 'error');
      console.error('CloudFlare 接口错误:', error);
    }
  }

  /**
   * 获取推特入口数据
   */
  async function fetchTwitterData() {
    setStatus('status-twitter', 'loading');
    try {
      // 添加时间戳参数避免缓存
      const timestamp = Date.now();
      const response = await fetch(
        `https://x.com/cdn-cgi/trace?t=${timestamp}`
      );
      const text = await response.text();

      // 解析文本格式的响应 (key=value 格式,每行一个)
      const data = {};
      text.split('\n').forEach((line) => {
        const [key, value] = line.split('=');
        if (key && value) {
          data[key.trim()] = value.trim();
        }
      });

      document.getElementById('twitter-ip').textContent = data.ip || '未知';
      document.getElementById('twitter-country').textContent =
        data.loc || '未知';
      document.getElementById('twitter-city').textContent = data.colo || '';
      setStatus('status-twitter', 'success');
    } catch (error) {
      document.getElementById('twitter-ip').innerHTML =
        '<span class="error">加载失败</span>';
      document.getElementById('twitter-country').textContent = '';
      document.getElementById('twitter-city').textContent = '';
      setStatus('status-twitter', 'error');
      console.error('推特入口接口错误:', error);
    }
  }

  /**
   * 获取访问统计数据
   */
  async function fetchVisitCount() {
    try {
      const response = await fetch(
        'https://tongji.090227.xyz/?id=cf.090227.xyz'
      );
      const data = await response.json();

      const visitCountElement = document.getElementById('visit-count');
      if (visitCountElement && data.visitCount !== undefined) {
        visitCountElement.textContent = data.visitCount;
      }
    } catch (error) {
      console.error('获取访问统计失败:', error);
      const visitCountElement = document.getElementById('visit-count');
      if (visitCountElement) {
        visitCountElement.textContent = '加载失败';
      }
    }
  }

  /**
   * 页面加载时自动获取网络信息
   */
  async function loadNetworkInfo() {
    if (document.querySelector('.network-cards-container')) {
      await Promise.all([
        fetchIpipData(),
        fetchEdgeOneData(),
        fetchCloudFlareData(),
        fetchTwitterData(),
      ]);

      // 优化：所有网络信息加载完成后, 使 IP 可点击
      // 移除了 setTimeout，直接调用
      markIpAsClickable();
    }
  }

  // --- 4. IP 详情弹窗 (Modal) 功能 ---
  // [所有 IP 弹窗相关函数保持不变，此处省略]
  // ...

  /**
   * 优化：标记 IP 为可点击
   * (原 makeIpClickable 函数的职责分离)
   */
  function markIpAsClickable() {
    const ipElements = document.querySelectorAll('.ip-text');

    ipElements.forEach((element) => {
      const ipText = element.textContent.trim();

      // 跳过已经标记为错误、加载中、未知的元素
      if (
        element.querySelector('.error') ||
        ipText === '加载中...' ||
        ipText === '未知' ||
        element.classList.contains('clickable')
      ) {
        return;
      }

      // 添加可点击样式
      element.classList.add('clickable');
    });
  }

  /**
   * 优化：获取并显示 IP 详情的逻辑
   * (从原 makeIpClickable 提取)
   * @param {HTMLElement} ipElement - 被点击的 IP 元素
   */
  async function fetchAndShowIpDetails(ipElement) {
    let ipText = ipElement.textContent.trim();

    // 移除可能存在的加载动画
    const existingSpinner = ipElement.querySelector('.loading-spinner');
    if (existingSpinner) {
      return; // 正在加载中,不重复请求
    }

    // 跳过显示"加载中..."或"未知"的元素
    if (ipText === '加载中...' || ipText === '未知') {
      return;
    }

    // 将 * 替换为 0
    const cleanIp = ipText.replace(/\*/g, '0');

    // 添加加载动画
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    ipElement.appendChild(spinner);

    try {
      const response = await fetch(
        `https://api.ipapi.cmliussss.net/?ip=${cleanIp}`
      );

      if (!response.ok) {
        throw new Error('查询失败');
      }

      const data = await response.json();

      // 移除加载动画
      spinner.remove();

      // 显示详情弹窗
      showIpDetailModal(data);
    } catch (error) {
      // 移除加载动画
      spinner.remove();

      // 显示错误提示
      showToast('❌ 查询IP详细信息失败');
      console.error('IP查询错误:', error);
    }
  }

  // --- 4a. IP 详情弹窗 - 帮助函数 ---

  /** 将布尔值转换为 emoji */
  function boolToEmoji(value, trueEmoji = '✅', falseEmoji = '❌') {
    return value ? trueEmoji : falseEmoji;
  }

  /** 将 IP 类型转换为中文并添加样式 */
  function formatIpType(type) {
    if (!type) return '<span class="ip-type-unknown">未知</span>';

    const typeMap = {
      isp: { text: '住宅', class: 'ip-type-residential' },
      hosting: { text: '机房', class: 'ip-type-hosting' },
      business: { text: '商用', class: 'ip-type-business' },
    };

    const typeInfo = typeMap[type.toLowerCase()] || {
      text: type,
      class: 'ip-type-unknown',
    };
    return `<span class="${typeInfo.class}">${typeInfo.text}</span>`;
  }

  /** 获取威胁等级的样式类 */
  function getThreatBadgeClass(score) {
    if (!score) return 'badge-info';

    const numScore = parseFloat(score);
    if (numScore < 0.001) return 'badge-success';
    if (numScore < 0.01) return 'badge-info';
    if (numScore < 0.1) return 'badge-warning';
    return 'badge-danger';
  }

  /** 计算综合滥用评分 */
  function calculateAbuseScore(companyScore, asnScore, securityFlags = {}) {
    // 如果两个分数都无效，返回null
    if (!companyScore || companyScore === '未知') companyScore = 0;
    if (!asnScore || asnScore === '未知') asnScore = 0;

    const company = parseFloat(companyScore) || 0;
    const asn = parseFloat(asnScore) || 0;

    // 计算基础评分：(company + asn) / 2 * 5
    let baseScore = ((company + asn) / 2) * 5;

    // 计算安全风险附加分：每个安全风险项增加 20%
    let riskAddition = 0;
    const riskFlags = [
      securityFlags.is_crawler, // 爬虫
      securityFlags.is_proxy, // 代理服务器
      securityFlags.is_vpn, // VPN
      securityFlags.is_tor, // Tor 网络
      securityFlags.is_abuser, // 滥用 IP
      securityFlags.is_bogon, // 虚假 IP
    ];

    // 统计为 true 的风险项数量
    const riskCount = riskFlags.filter((flag) => flag === true).length;
    riskAddition = riskCount * 0.15; // 每个风险项增加 15%

    // 最终评分 = 基础评分 + 风险附加分
    const finalScore = baseScore + riskAddition;

    // 如果基础评分和风险附加分都是0，返回null
    if (baseScore === 0 && riskAddition === 0) return null;

    return finalScore;
  }

  /** 获取滥用评分的颜色等级 */
  function getAbuseScoreBadgeClass(percentage) {
    if (percentage === null || percentage === undefined) return 'badge-info';

    if (percentage >= 100) return 'badge-critical'; // 危险红色 >= 100%
    if (percentage >= 20) return 'badge-high'; // 橘黄色 15-99.99%
    if (percentage >= 5) return 'badge-elevated'; // 黄色 5-14.99%
    if (percentage >= 0.25) return 'badge-low'; // 淡绿色 0.25-4.99%
    return 'badge-verylow'; // 绿色 < 0.25%
  }

  /** 格式化滥用评分为百分比 */
  function formatAbuseScorePercentage(score) {
    if (score === null || score === undefined) return '未知';

    const percentage = score * 100;
    return percentage.toFixed(2) + '%';
  }

  /** 切换评分算法说明气泡 */
  function toggleScoreTooltip(helpIcon) {
    const tooltip = helpIcon.nextElementSibling;
    const isShowing = tooltip.classList.contains('show');

    // 隐藏所有其他气泡
    document.querySelectorAll('.score-tooltip.show').forEach((t) => {
      if (t !== tooltip) t.classList.remove('show');
    });

    // 切换当前气泡
    tooltip.classList.toggle('show');

    // (优化：关闭气泡的事件监听已移至全局 initEventListeners)
  }

  // --- 4b. IP 详情弹窗 - 渲染函数 ---

  /**
   * 显示 IP 详情弹窗 (纯渲染)
   * 优化：移除了所有内部的事件监听器
   * @param {object} data - IP 详细信息
   */
  function showIpDetailModal(data) {
    // 创建弹窗
    const modal = document.createElement('div');
    modal.className = 'ip-detail-modal';

    // 计算综合滥用评分（风控值）
    const companyScore = data.company?.abuser_score;
    const asnScore = data.asn?.abuser_score;

    // 收集安全风险标志
    const securityFlags = {
      is_crawler: data.is_crawler,
      is_proxy: data.is_proxy,
      is_vpn: data.is_vpn,
      is_tor: data.is_tor,
      is_abuser: data.is_abuser,
      is_bogon: data.is_bogon,
    };

    const combinedScore = calculateAbuseScore(
      companyScore,
      asnScore,
      securityFlags
    );

    let riskControlHTML = '';
    if (combinedScore !== null) {
      const scorePercentage = combinedScore * 100;
      const badgeClass = getAbuseScoreBadgeClass(scorePercentage);
      const formattedScore = formatAbuseScorePercentage(combinedScore);

      // 根据百分比确定风险等级文本
      let riskLevel = '';
      if (scorePercentage >= 100) riskLevel = '极度危险';
      else if (scorePercentage >= 20) riskLevel = '高风险';
      else if (scorePercentage >= 5) riskLevel = '轻微风险';
      else if (scorePercentage >= 0.25) riskLevel = '纯净';
      else riskLevel = '极度纯净';

      riskControlHTML = `
            <span class="ip-detail-badge ${badgeClass}">${formattedScore} ${riskLevel}</span>
        `;
    } else {
      riskControlHTML = '未知';
    }

    // 构建详情内容
    let detailHTML = `
        <div class="ip-detail-content">
            <button class="ip-detail-close" aria-label="关闭弹窗">×</button>
            <div class="ip-detail-title">
                🔍 IP 详细信息
                <span class="ip-detail-source">数据来源: ipapi.is</span>
            </div>
    `;

    // 基本信息
    detailHTML += `
        <div class="ip-detail-section">
            <div class="ip-detail-section-title">📍 基本信息</div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">IP 地址</span>
                <span class="ip-detail-value">${data.ip || '未知'}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">区域互联网注册机构</span>
                <span class="ip-detail-value">${data.rir || '未知'}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">运营商 / ASN 类型</span>
                <span class="ip-detail-value">${formatIpType(
                  data.company?.type
                )} / ${formatIpType(data.asn?.type)}</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">
                    综合滥用评分
                    <span class="score-help-icon" title="点击查看算法说明">?</span>
                    <span class="score-tooltip">
                        <div class="tooltip-header">
                            <span class="tooltip-title">📊 综合滥用评分算法</span>
                        </div>
                        <div class="tooltip-section">
                            <p class="tooltip-section-title">评分公式</p>
                            <div class="formula-item">
                                <span class="formula-name">基础分</span>
                                <span class="formula-equation"><code>(运营商分 + ASN分) / 2 * 5</code></span>
                            </div>
                            <div class="formula-item">
                                <span class="formula-name">风险附加</span>
                                <span class="formula-equation"><code>风险项数量 * 15%</code></span>
                            </div>
                        </div>
                        <div class="tooltip-section">
                            <p class="tooltip-section-title">安全风险项</p>
                            <ul class="risk-list">
                                <li>爬虫 (Crawler)</li>
                                <li>代理 (Proxy)</li>
                                <li>VPN</li>
                                <li>Tor 网络</li>
                                <li>滥用IP (Abuser)</li>
                                <li>虚假IP (Bogon)</li>
                            </ul>
                        </div>
                    </span>
                </span>
                <span class="ip-detail-value">${riskControlHTML}</span>
            </div>
        </div>
    `;

    // 安全检测
    detailHTML += `
        <div class="ip-detail-section">
            <div class="ip-detail-section-title">🛡️ 安全检测</div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">移动网络</span>
                <span class="ip-detail-value">${
                  data.is_mobile
                    ? '<span class="success-text">📱 是</span>'
                    : '否'
                }</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">数据中心</span>
                <span class="ip-detail-value">${
                  data.is_datacenter
                    ? '<span class="warning-text">🏢 是</span>'
                    : '否'
                }</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">卫星网络</span>
                <span class="ip-detail-value">${
                  data.is_satellite
                    ? '<span class="success-text">🛰️ 是</span>'
                    : '否'
                }</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">爬虫</span>
                <span class="ip-detail-value">${
                  data.is_crawler
                    ? '<span class="danger-text">🤖 是</span>'
                    : '✅ 否'
                }</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">代理服务器</span>
                <span class="ip-detail-value">${
                  data.is_proxy
                    ? '<span class="danger-text">⚠️ 是</span>'
                    : '✅ 否'
                }</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">VPN</span>
                <span class="ip-detail-value">${
                  data.is_vpn
                    ? '<span class="danger-text">⚠️ 是</span>'
                    : '✅ 否'
                }</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">Tor 网络</span>
                <span class="ip-detail-value">${
                  data.is_tor
                    ? '<span class="danger-text">⚠️ 是</span>'
                    : '✅ 否'
                }</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">滥用 IP</span>
                <span class="ip-detail-value">${
                  data.is_abuser
                    ? '<span class="danger-text">⚠️ 是</span>'
                    : '✅ 否'
                }</span>
            </div>
            <div class="ip-detail-item">
                <span class="ip-detail-label">虚假 IP</span>
                <span class="ip-detail-value">${
                  data.is_bogon
                    ? '<span class="danger-text">⚠️ 是</span>'
                    : '✅ 否'
                }</span>
            </div>
        </div>
    `;

    // 位置信息
    if (data.location) {
      detailHTML += `
            <div class="ip-detail-section">
                <div class="ip-detail-section-title">🌍 位置信息</div>
                <div class="ip-detail-item">
                    <span class="ip-detail-label">国家</span>
                    <span class="ip-detail-value">${
                      data.location.country || '未知'
                    } (${data.location.country_code || '-'})</span>
                </div>
                ${
                  data.location.state
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">省份/州</span>
                    <span class="ip-detail-value">${data.location.state}</span>
                </div>
                `
                    : ''
                }
                ${
                  data.location.city
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">城市</span>
                    <span class="ip-detail-value">${data.location.city}</span>
                </div>
                `
                    : ''
                }
                ${
                  data.location.zip
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">邮编</span>
                    <span class="ip-detail-value">${data.location.zip}</span>
                </div>
                `
                    : ''
                }
                ${
                  data.location.latitude && data.location.longitude
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">坐标</span>
                    <span class="ip-detail-value">${data.location.latitude}, ${data.location.longitude}</span>
                </div>
                `
                    : ''
                }
                ${
                  data.location.timezone
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">时区</span>
                    <span class="ip-detail-value">${data.location.timezone}</span>
                </div>
                `
                    : ''
                }
                ${
                  data.location.local_time
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">当地时间</span>
                    <span class="ip-detail-value">${data.location.local_time}</span>
                </div>
                `
                    : ''
                }
                <div class="ip-detail-item">
                    <span class="ip-detail-label">欧盟成员</span>
                    <span class="ip-detail-value">${boolToEmoji(
                      data.location.is_eu_member,
                      '🇪🇺 是',
                      '否'
                    )}</span>
                </div>
            </div>
        `;
    }

    // 运营商信息
    if (data.company) {
      const abuserScore = data.company.abuser_score || '未知';
      const badgeClass = getThreatBadgeClass(abuserScore);

      detailHTML += `
            <div class="ip-detail-section">
                <div class="ip-detail-section-title">🏢 运营商信息</div>
                <div class="ip-detail-item">
                    <span class="ip-detail-label">运营商名称</span>
                    <span class="ip-detail-value">${
                      data.company.name || '未知'
                    }</span>
                </div>
                ${
                  data.company.domain
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">域名</span>
                    <span class="ip-detail-value">${data.company.domain}</span>
                </div>
                `
                    : ''
                }
                <div class="ip-detail-item">
                    <span class="ip-detail-label">类型</span>
                    <span class="ip-detail-value">${
                      data.company.type || '未知'
                    }</span>
                </div>
                ${
                  data.company.network
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">网络范围</span>
                    <span class="ip-detail-value">${data.company.network}</span>
                </div>
                `
                    : ''
                }
                <div class="ip-detail-item">
                    <span class="ip-detail-label">滥用评分</span>
                    <span class="ip-detail-value"><span class="ip-detail-badge ${badgeClass}">${abuserScore}</span></span>
                </div>
            </div>
        `;
    }

    // ASN 信息
    if (data.asn) {
      const asnAbuserScore = data.asn.abuser_score || '未知';
      const asnBadgeClass = getThreatBadgeClass(asnAbuserScore);

      detailHTML += `
            <div class="ip-detail-section">
                <div class="ip-detail-section-title">🔢 ASN 信息</div>
                <div class="ip-detail-item">
                    <span class="ip-detail-label">ASN 编号</span>
                    <span class="ip-detail-value">AS${
                      data.asn.asn || '未知'
                    }</span>
                </div>
                ${
                  data.asn.org
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">组织</span>
                    <span class="ip-detail-value">${data.asn.org}</span>
                </div>
                `
                    : ''
                }
                ${
                  data.asn.route
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">路由</span>
                    <span class="ip-detail-value">${data.asn.route}</span>
                </div>
                `
                    : ''
                }
                ${
                  data.asn.type
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">类型</span>
                    <span class="ip-detail-value">${data.asn.type}</span>
                </div>
                `
                    : ''
                }
                <div class="ip-detail-item">
                    <span class="ip-detail-label">滥用评分</span>
                    <span class="ip-detail-value"><span class="ip-detail-badge ${asnBadgeClass}">${asnAbuserScore}</span></span>
                </div>
                ${
                  data.asn.country
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">国家代码</span>
                    <span class="ip-detail-value">${data.asn.country.toUpperCase()}</span>
                </div>
                `
                    : ''
                }
            </div>
        `;
    }

    // 滥用联系信息
    if (data.abuse) {
      detailHTML += `
            <div class="ip-detail-section">
                <div class="ip-detail-section-title">📧 滥用举报联系方式</div>
                ${
                  data.abuse.name
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">联系人</span>
                    <span class="ip-detail-value">${data.abuse.name}</span>
                </div>
                `
                    : ''
                }
                ${
                  data.abuse.email
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">邮箱</span>
                    <span class="ip-detail-value">${data.abuse.email}</span>
                </div>
                `
                    : ''
                }
                ${
                  data.abuse.phone
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">电话</span>
                    <span class="ip-detail-value">${data.abuse.phone}</span>
                </div>
                `
                    : ''
                }
                ${
                  data.abuse.address
                    ? `
                <div class="ip-detail-item">
                    <span class="ip-detail-label">地址</span>
                    <span class="ip-detail-value">${data.abuse.address}</span>
                </div>
                `
                    : ''
                }
            </div>
        `;
    }

    detailHTML += `</div>`;
    modal.innerHTML = detailHTML;
    document.body.appendChild(modal);
  }

  // --- 5. 统一事件监听 (优化) ---
  // [initEventListeners 函数保持不变，此处省略]
  // ...

  /**
   * 初始化所有事件监听器
   * 采用事件委托模式
   */
  function initEventListeners() {
    // 全局点击事件委托
    document.body.addEventListener('click', (event) => {
      // 委托：复制域名
      const copyButton = event.target.closest('.copy-domain');
      if (copyButton) {
        const domain = copyButton.dataset.domain;
        if (domain) {
          copyDomain(domain);
        }
        return;
      }

      // 委托：IP 详情点击
      const ipElement = event.target.closest('.ip-text.clickable');
      if (ipElement) {
        fetchAndShowIpDetails(ipElement);
        return;
      }

      // 委托：IP 详情弹窗内的帮助气泡
      const helpIcon = event.target.closest('.score-help-icon');
      if (helpIcon) {
        event.stopPropagation();
        toggleScoreTooltip(helpIcon);
        return;
      }

      // 委托：IP 详情弹窗关闭按钮
      const closeModalButton = event.target.closest('.ip-detail-close');
      if (closeModalButton) {
        closeModalButton.closest('.ip-detail-modal').remove();
        return;
      }

      // 委托：点击弹窗背景关闭
      if (event.target.classList.contains('ip-detail-modal')) {
        event.target.remove();
        // 隐藏所有气泡
        document
          .querySelectorAll('.score-tooltip.show')
          .forEach((t) => t.classList.remove('show'));
        return;
      }

      // 委托：点击气泡外关闭气泡
      const activeTooltip = document.querySelector('.score-tooltip.show');
      if (activeTooltip && !activeTooltip.contains(event.target)) {
        activeTooltip.classList.remove('show');
        // 注意：这里没有 return，允许点击继续
      }
    });

    // 全局键盘事件
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // 关闭弹窗
        const modal = document.querySelector('.ip-detail-modal');
        if (modal) {
          modal.remove();
        }
        // 关闭气泡
        const tooltip = document.querySelector('.score-tooltip.show');
        if (tooltip) {
          tooltip.classList.remove('show');
        }
      }
    });
  }

  // --- 6. 应用初始化入口 ---

  /**
   * 启动应用
   */
  function initApp() {
    initTheme(); // (现在只负责绑定事件)
    initLazyLoading();
    loadNetworkInfo();
    fetchVisitCount();
    initEventListeners();
  }

  // 运行！
  initApp();
});
