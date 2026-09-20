const quoteData = [
  ['IC2303.CFE', '中证500股指', '0.00', '0.00', '0.00', '0.00'],
  ['cu2609.SHF', '沪铜2609', '11,404,000.00', '116,000.00', '116,000.00', '109,490.00'],
  ['000001.SZ', '平安银行', '1,022,543,914.24', '11.70', '11.68', '10.53'],
  ['688001.SH', '华兴源创', '751,189,672.00', '66.31', '66.09', '53.05'],
  ['au2702.SHF', '沪黄金2702', '26,239,000.00', '952.08', '959.14', '876.66'],
  ['000981.SZC', '山子高科', '379,265,558.45', '2.71', '2.69', '2.44'],
  ['000981.SZ', '山子高科', '379,265,558.45', '2.71', '2.69', '2.44'],
  ['000002.SZC', '万科A', '319,828,012.91', '3.19', '3.18', '2.87'],
  ['000002.SZ', '万科A', '319,828,012.91', '3.19', '3.18', '2.87'],
  ['000001.SZC', '平安银行', '1,022,543,914.24', '11.70', '11.68', '10.53'],
];

const batchImportRows = [
  { business: '普通交易', account: '牛定于购买力账号', orderType: '市价单', marketType: '最优五档即时成交剩余撤销', security: '600519', name: '贵州茅台', side: '买入', price: '', protection: '1,730.00', quantity: '300', mode: 'HighTouch' },
  { business: '普通交易', account: '80882048购买力账号', orderType: '市价单', marketType: '即时成交剩余撤销', security: '000001', name: '平安银行', side: '卖出', price: '', protection: '', quantity: '600', mode: 'LowTouch' },
  { business: '普通交易', account: '80882048购买力账号', orderType: '限价单', marketType: '', security: '600009', name: '上海机场', side: '买入', price: '22.85', protection: '', quantity: '1,000', mode: 'LowTouch' },
];

// 原型通过本地数据模拟后端返回；生产前端不保存委托策略和保护限价规则。
const marketTypeLicenseEnabled = new URLSearchParams(window.location.search).get('marketTypeLicense') !== 'off';
const demoBackendOrderEntryConfig = {
  SH: {
    protectionLimit: { visible: true, required: true },
    types: [
      ['five-ioc', '最优五档即时成交剩余撤销'],
      ['five-limit', '最优五档即时成交剩余转限价'],
      ['own-best', '本方最优价格'],
      ['counterparty', '对手方最优价格'],
    ],
  },
  SZ: {
    protectionLimit: { visible: false, required: false },
    types: [
      ['counterparty', '对手方最优价格'],
      ['own-best', '本方最优价格'],
      ['five-ioc', '最优五档即时成交剩余撤销'],
      ['ioc', '即时成交剩余撤销（IOC）'],
      ['fok', '全额成交或撤销（FOK）'],
    ],
  },
  BJ: {
    protectionLimit: { visible: true, required: true },
    types: [
      ['counterparty', '对手方最优价格'],
      ['own-best', '本方最优价格'],
      ['five-ioc', '最优五档即时成交剩余撤销'],
      ['five-limit', '最优五档即时成交剩余转限价'],
    ],
  },
};

let activeOrderEntryConfig = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function toast(message, type = 'error') {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('error', type === 'error');
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

function renderQuotes() {
  $('#quote-rows').innerHTML = quoteData.map((row, index) => `
    <tr data-code="${row[0]}" data-name="${row[1]}">
      <td>${index + 1}</td><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td><td>${row[4]}</td><td>${row[5]}</td>
    </tr>`).join('');
}

function renderDepth() {
  const buys = [['11.84', '128'], ['11.83', '1648'], ['11.82', '1782'], ['11.81', '1103'], ['11.80', '3429']];
  const sells = [['11.85', '1371'], ['11.86', '8386'], ['11.87', '2216'], ['11.88', '4716'], ['11.89', '9045']];
  const rows = values => values.map((value, index) => `<div class="depth-row"><i>${index + 1}</i><b>${value[0]}</b><span>${value[1]}</span></div>`).join('');
  $('#buy-depth').innerHTML = rows(buys);
  $('#sell-depth').innerHTML = rows(sells);
}

function securityMarket(code) {
  const suffix = code.split('.')[1];
  if (suffix === 'SH') return 'SH';
  if (suffix === 'SZ') return 'SZ';
  if (suffix === 'BJ') return 'BJ';
  return '';
}

function requestOrderEntryConfig(code) {
  const config = demoBackendOrderEntryConfig[securityMarket(code)];
  return Promise.resolve(config || { protectionLimit: { visible: false, required: false }, types: [] });
}

function renderBatchPreview() {
  $('#batch-preview-body').innerHTML = batchImportRows.map((row, index) => `
    <tr>
      <td>${index + 2}</td><td>${row.business}</td><td>${row.account}</td><td>${row.orderType}</td><td>${row.marketType}</td><td>${row.security}</td><td>${row.side}</td><td>${row.price}</td><td>${row.protection}</td><td>${row.quantity}</td><td>${row.mode}</td><td class="valid">通过</td>
    </tr>`).join('');
}

function appendImportedOrders() {
  const body = $('#orders-list-body');
  const start = body.children.length + 1;
  body.insertAdjacentHTML('beforeend', batchImportRows.map((row, index) => `
    <tr>
      <td>${start + index}</td><td><button>修改</button></td><td class="${row.side === '买入' ? 'buy-text' : 'sell-text'}">${row.side}</td><td class="pending-status">待报</td><td>${row.business}</td><td>${row.account}</td><td>${row.orderType}</td><td>${row.marketType}</td><td>${row.security}</td><td>${row.name}</td><td>${row.orderType === '市价单' ? '市价' : row.price}</td><td>${row.protection}</td><td>${row.quantity}</td><td>${row.mode}</td><td class="success-text">导入成功</td>
    </tr>`).join(''));
}

function showWorkspace(view) {
  const showOrders = view === 'orders';
  const showData = view === 'data';
  $('#market-terminal').classList.toggle('hidden', showOrders || showData);
  $('#orders-workspace').classList.toggle('hidden', !showOrders);
  $('#data-workspace').classList.toggle('hidden', !showData);
}

function openBatchDialog() {
  $('#batch-file').value = '';
  $('#batch-file-name').textContent = '未选择文件';
  $('#batch-preview').classList.add('hidden');
  $('#batch-import').disabled = true;
  $('#batch-backdrop').classList.remove('hidden');
}

function closeBatchDialog() {
  $('#batch-backdrop').classList.add('hidden');
}

function openLayer(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function closeLayer(id) {
  document.getElementById(id)?.classList.add('hidden');
}

function activateHighTouchOrder() {
  $('#hightouch-actions').innerHTML = '<button data-ht-action="direct">直接下单</button><button data-ht-action="split">拆单</button>';
  toast('HighTouch订单已确认', 'info');
}

function toggleSplitOrderFields() {
  const isMarket = $('#split-order-type').value === 'market';
  $('#split-market-type-row').classList.toggle('hidden', !isMarket);
  $('#split-price-row').classList.toggle('hidden', isMarket);
  if (isMarket) $('#split-price').value = '';
}

function addSplitDetail() {
  const quantity = Number($('#split-quantity').value || 0);
  if (quantity <= 0) return toast('请输入有效数量');
  const isMarket = $('#split-order-type').value === 'market';
  const price = Number($('#split-price').value || 0);
  if (!isMarket && price <= 0) return toast('请输入有效价格');
  const row = isMarket
    ? ['000001', '市价单', '即时成交剩余撤销', 'STOCK', 'CNY', 'Buy', '待报', '市价', '', quantity, 'QFII', '', '2700', 'HighTouch', 'None', '', '<button>删除</button>']
    : ['000001', '限价单', '', 'STOCK', 'CNY', 'Buy', '待报', price.toFixed(2), '', quantity, 'QFII', '', '2700', 'HighTouch', 'None', '', '<button>删除</button>'];
  $('#split-detail-body').insertAdjacentHTML('beforeend', `<tr>${row.map(value => `<td>${value}</td>`).join('')}</tr>`);
  closeLayer('split-add-backdrop');
}

function updateMarketTypes(config) {
  const select = $('#market-type');
  const types = config?.types || [];
  const previous = select.value;
  select.innerHTML = '<option value="">请选择委托策略</option>' + (types || [])
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');
  if (types?.some(([value]) => value === previous)) select.value = previous;
}

function updateAmount() {
  if ($('#order-type').value === 'market') {
    $('#amount').value = '';
    return;
  }
  const quantity = Number($('#quantity').value || 0);
  const price = Number($('#price').value || 0);
  $('#amount').value = quantity > 0 && price > 0
    ? `${(quantity * price).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CNY`
    : '-';
}

async function updateOrderType() {
  const isMarket = $('#order-type').value === 'market';
  $('#market-type-field').classList.toggle('hidden', !isMarket || !marketTypeLicenseEnabled);
  $('#amount-row').classList.toggle('hidden', isMarket);
  $('#price-label').textContent = isMarket ? '保护限价' : '订单价格';
  $('#price-caption').innerHTML = isMarket ? '买入最高价 / 卖出最低价' : '等于当前价 <span>0.00%</span>';

  if (!isMarket) {
    activeOrderEntryConfig = null;
    $('#price-field').classList.remove('hidden');
    $('#price-caption').classList.remove('hidden');
    $('#market-type').value = '';
    $('#price').required = true;
    $('#price').setAttribute('aria-required', 'true');
    updateAmount();
    return;
  }

  $('#price').value = '';
  activeOrderEntryConfig = await requestOrderEntryConfig($('#security').value);
  const showProtectionLimit = activeOrderEntryConfig.protectionLimit.visible;
  const requiresProtectionLimit = showProtectionLimit && activeOrderEntryConfig.protectionLimit.required;
  $('#price-field').classList.toggle('hidden', !showProtectionLimit);
  $('#price-caption').classList.toggle('hidden', !showProtectionLimit);
  if (!showProtectionLimit) $('#price').value = '';
  $('#price').required = requiresProtectionLimit;
  $('#price').setAttribute('aria-required', requiresProtectionLimit ? 'true' : 'false');
  if (marketTypeLicenseEnabled) updateMarketTypes(activeOrderEntryConfig);
  updateAmount();
}

function setSecurityError(hasError) {
  const security = $('#security');
  security.classList.toggle('field-error', hasError);
  security.setAttribute('aria-invalid', hasError ? 'true' : 'false');
}

function guardMarketType(event) {
  if ($('#security').value) {
    setSecurityError(false);
    return;
  }
  event.preventDefault();
  setSecurityError(true);
}

function setSide(side) {
  $$('.side-switch button').forEach(button => button.classList.toggle('active', button.dataset.side === side));
  const submit = $('#place-order');
  submit.textContent = side === 'buy' ? '买入' : '卖出';
  submit.className = `place-order ${side}`;
  submit.dataset.side = side;
  if ($('#order-type').value === 'market') $('#price').value = '';
}

function selectedText(selector) {
  const select = $(selector);
  return select.options[select.selectedIndex]?.textContent.trim() || '-';
}

function money(value) {
  return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function closeConfirmation() {
  $('#confirm-backdrop').classList.add('hidden');
}

function openConfirmation() {
  const isMarket = $('#order-type').value === 'market';
  const side = $('#place-order').dataset.side === 'sell' ? '卖出' : '买入';
  const quantity = Number($('#quantity').value || 0);
  const price = Number($('#price').value || 0);
  const code = $('#security').value;
  const showProtectionLimit = isMarket && activeOrderEntryConfig?.protectionLimit.visible;
  const name = selectedText('#security').replace(code, '').trim();
  const channel = selectedText('#channel');

  $('#confirm-account').textContent = selectedText('#account');
  $('#confirm-channel').textContent = channel === '-' ? '' : channel;
  $('#confirm-order-type').textContent = isMarket ? '市价单' : '限价单';
  $('#confirm-market-type').textContent = isMarket && marketTypeLicenseEnabled ? selectedText('#market-type') : '-';
  $('.market-confirm-row').classList.toggle('hidden', !isMarket || !marketTypeLicenseEnabled);
  $('#confirm-security').textContent = `${name}（${code}）`;
  $('#confirm-side').textContent = side;
  $('#confirm-side').className = `confirm-side ${side === '买入' ? 'buy' : 'sell'}`;
  $('#confirm-mode').textContent = selectedText('#order-mode');
  $('#confirm-remark').textContent = $('#remark').value.trim() || '-';
  $('#market-warning').classList.toggle('hidden', !isMarket);
  $('#market-warning p').textContent = showProtectionLimit
    ? '市价单成交价格存在不确定性。保护限价仅限制可接受的价格边界，实际成交价格和成交数量以柜台回报为准。'
    : '市价单成交价格存在不确定性，实际成交价格和成交数量以柜台回报为准。';

  const quantityWarning = $('#quantity-warning');
  quantityWarning.classList.toggle('hidden', quantity <= 500);
  quantityWarning.innerHTML = `<span aria-hidden="true">△</span><p>您输入的委托数量${quantity}大于最大可买500。</p>`;

  $('#confirm-values').innerHTML = isMarket
    ? `${showProtectionLimit ? `<div><span>保护限价</span><strong>${money(price)}</strong></div>` : ''}<div><span>数量</span><strong>${quantity}</strong></div>`
    : `<div><span>价格</span><strong>${money(price)}</strong></div><div><span>数量</span><strong>${quantity}</strong></div><div><span>委托金额</span><strong>CNY ${money(quantity * price)}</strong></div>`;

  const submit = $('#confirm-submit');
  submit.textContent = side;
  submit.className = `submit ${side === '买入' ? 'buy' : 'sell'}`;
  $('#confirm-backdrop').classList.remove('hidden');
  submit.focus();
}

function placeOrder() {
  const security = $('#security').value;
  const quantity = Number($('#quantity').value || 0);
  const price = Number($('#price').value || 0);
  const isMarket = $('#order-type').value === 'market';
  if (!security) {
    setSecurityError(true);
    return;
  }
  setSecurityError(false);
  if (isMarket && marketTypeLicenseEnabled && !$('#market-type').value) return toast('请选择委托策略');
  const requiresProtectionPrice = isMarket && activeOrderEntryConfig?.protectionLimit.required;
  if ((!isMarket || requiresProtectionPrice) && price <= 0) {
    return toast(isMarket ? '请输入有效保护限价' : '请输入有效订单价格');
  }
  if (quantity <= 0) return toast('请输入有效委托数量');
  openConfirmation();
}

renderQuotes();
renderDepth();
setSide('buy');
updateOrderType();

$$('.nav-item').forEach(button => button.addEventListener('click', () => {
  $$('.nav-item').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  if (button.dataset.section === '交易') showWorkspace('orders');
  else if (button.dataset.section === '数据') showWorkspace('data');
  else showWorkspace('market');
}));

$$('.data-tabs button').forEach(button => button.addEventListener('click', () => {
  $$('.data-tabs button').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  if (button.textContent.trim() !== '订单查询') toast(`${button.textContent.trim()}为导航演示`, 'info');
}));

$$('.data-search').forEach(button => button.addEventListener('click', () => toast('查询条件已应用', 'info')));

$$('.top-tab').forEach(button => button.addEventListener('click', () => {
  $$('.top-tab').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
}));

$$('.group-tabs button').forEach(button => button.addEventListener('click', () => {
  $$('.group-tabs button').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
}));

$('#quote-rows').addEventListener('click', event => {
  const row = event.target.closest('tr');
  if (!row) return;
  $$('#quote-rows tr').forEach(item => item.classList.remove('selected'));
  row.classList.add('selected');
  $('#quote-code').textContent = row.dataset.code;
  $('#quote-name').textContent = row.dataset.name;
});

$$('.trade-tabs button').forEach(button => button.addEventListener('click', () => {
  $$('.trade-tabs button').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
}));

$$('.side-switch button').forEach(button => button.addEventListener('click', () => setSide(button.dataset.side)));

$$('.stepper button').forEach(button => button.addEventListener('click', () => {
  const input = document.getElementById(button.dataset.target);
  button.dataset.dir === 'up' ? input.stepUp() : input.stepDown();
  updateAmount();
}));

$$('.fraction-row button').forEach(button => button.addEventListener('click', () => {
  const raw = 500 * Number(button.dataset.ratio);
  $('#quantity').value = Math.max(100, Math.floor(raw / 100) * 100);
  updateAmount();
}));

$('#order-type').addEventListener('change', () => {
  $('#price').value = '';
  updateOrderType();
});
$('#security').addEventListener('change', () => {
  if ($('#security').value) setSecurityError(false);
  if ($('#order-type').value === 'market') updateOrderType();
});
$('#market-type').addEventListener('pointerdown', guardMarketType);
$('#market-type').addEventListener('keydown', event => {
  if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) guardMarketType(event);
});
$('#market-type').addEventListener('change', () => {
  if ($('#order-type').value === 'market') $('#price').value = '';
});
$('#price').addEventListener('input', updateAmount);
$('#quantity').addEventListener('input', updateAmount);
$('#place-order').addEventListener('click', placeOrder);
$('#confirm-close').addEventListener('click', closeConfirmation);
$('#confirm-cancel').addEventListener('click', closeConfirmation);
$('#confirm-backdrop').addEventListener('click', event => {
  if (event.target === $('#confirm-backdrop')) closeConfirmation();
});
$('#confirm-submit').addEventListener('click', () => {
  const side = $('#confirm-submit').textContent;
  closeConfirmation();
  toast(`${side}委托已提交（演示）`, 'info');
});
$('#batch-order-open').addEventListener('click', openBatchDialog);
$('#batch-close').addEventListener('click', closeBatchDialog);
$('#batch-cancel').addEventListener('click', closeBatchDialog);
$('#batch-backdrop').addEventListener('click', event => {
  if (event.target === $('#batch-backdrop')) closeBatchDialog();
});
$('#batch-file').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  $('#batch-file-name').textContent = file.name;
  renderBatchPreview();
  $('#batch-preview').classList.remove('hidden');
  $('#batch-import').disabled = false;
});
$('#batch-import').addEventListener('click', () => {
  appendImportedOrders();
  closeBatchDialog();
  toast(`已导入 ${batchImportRows.length} 笔订单`, 'info');
});
$('#orders-list-body').addEventListener('click', event => {
  const action = event.target.closest('[data-ht-action]')?.dataset.htAction;
  if (!action) return;
  if (action === 'accept') activateHighTouchOrder();
  if (action === 'cancel') toast('订单已撤销（演示）', 'info');
  if (action === 'direct') openLayer('ht-order-backdrop');
  if (action === 'split') openLayer('split-backdrop');
});
$$('[data-close]').forEach(button => button.addEventListener('click', () => closeLayer(button.dataset.close)));
$('#ht-order-backdrop').addEventListener('click', event => {
  if (event.target === $('#ht-order-backdrop')) closeLayer('ht-order-backdrop');
});
$('#split-backdrop').addEventListener('click', event => {
  if (event.target === $('#split-backdrop')) closeLayer('split-backdrop');
});
$('#split-add-backdrop').addEventListener('click', event => {
  if (event.target === $('#split-add-backdrop')) closeLayer('split-add-backdrop');
});
$('#ht-reject').addEventListener('click', () => {
  closeLayer('ht-order-backdrop');
  toast('订单已拒绝（演示）', 'info');
});
$('#ht-submit').addEventListener('click', () => {
  closeLayer('ht-order-backdrop');
  toast('HighTouch订单已提交（演示）', 'info');
});
$('#split-add').addEventListener('click', () => openLayer('split-add-backdrop'));
$('#split-order-type').addEventListener('change', toggleSplitOrderFields);
$('#split-add-confirm').addEventListener('click', addSplitDetail);
$('#split-confirm').addEventListener('click', () => {
  if (!$('#split-detail-body').children.length) return toast('请先新增拆单明细');
  closeLayer('split-backdrop');
  toast('拆单已提交（演示）', 'info');
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeConfirmation();
    closeBatchDialog();
    closeLayer('ht-order-backdrop');
    closeLayer('split-backdrop');
    closeLayer('split-add-backdrop');
  }
});

if (new URLSearchParams(window.location.search).get('view') === 'batch') {
  const tradeNav = $$('.nav-item').find(button => button.dataset.section === '交易');
  $$('.nav-item').forEach(item => item.classList.remove('active'));
  tradeNav?.classList.add('active');
  showWorkspace('orders');
}
