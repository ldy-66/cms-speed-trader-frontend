const state = {
  page: 1,
  orders: Array.from({ length: 13 }, (_, index) => ({
    id: index + 1,
    trader: '',
    detail: '',
    customer: 'JSYR',
    selected: false,
    visible: true,
  })),
};

// 原型通过本地数据模拟后端返回；生产前端不保存市价类型和保护限价规则。
const marketTypeLicenseEnabled = new URLSearchParams(window.location.search).get('marketTypeLicense') !== 'off';
const demoBackendOrderEntryConfig = {
  SH: {
    protectionLimit: { visible: true, required: true },
    types: [
      { value: 'five-ioc', label: '最优五档即时成交剩余撤销' },
      { value: 'five-limit', label: '最优五档即时成交剩余转限价' },
      { value: 'counterparty', label: '对手方最优价格' },
      { value: 'own-best', label: '本方最优价格' },
    ],
  },
  SZ: {
    protectionLimit: { visible: false, required: false },
    types: [
      { value: 'counterparty', label: '对手方最优价格' },
      { value: 'own-best', label: '本方最优价格' },
      { value: 'five-ioc', label: '最优五档即时成交剩余撤销' },
      { value: 'ioc', label: '即时成交剩余撤销（IOC）' },
      { value: 'fok', label: '全额成交或撤销（FOK）' },
    ],
  },
  BJ: {
    protectionLimit: { visible: true, required: true },
    types: [
      { value: 'counterparty', label: '对手方最优价格' },
      { value: 'own-best', label: '本方最优价格' },
      { value: 'five-ioc', label: '最优五档即时成交剩余撤销' },
      { value: 'five-limit', label: '最优五档即时成交剩余转限价' },
    ],
  },
};

let activeOrderEntryConfig = null;
let pendingOrderSnapshot = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function toast(message, type = 'info') {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('error', type === 'error');
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

function renderCustomerOrders() {
  const body = $('#customer-order-rows');
  body.innerHTML = '';
  state.orders.filter(order => order.visible).forEach(order => {
    const tr = document.createElement('tr');
    tr.dataset.id = order.id;
    tr.classList.toggle('selected', order.selected);
    tr.innerHTML = `
      <td><input class="row-check" type="checkbox" ${order.selected ? 'checked' : ''} aria-label="选择第${order.id}行" /></td>
      <td>${order.selected ? '<button class="link-button row-cancel">撤单</button>' : ''}</td>
      <td>${order.trader}</td>
      <td>${order.detail}</td>
      <td class="customer-name">${order.customer}</td>`;
    body.appendChild(tr);
  });
}

function renderOrderBook() {
  const rows = [];
  for (let level = 5; level >= 1; level -= 1) {
    rows.push(`<div class="book-row ask"><span class="level-badge">${level}</span><span class="book-price">−</span><span class="book-qty">0</span></div>`);
  }
  for (let level = 1; level <= 5; level += 1) {
    rows.push(`<div class="book-row bid"><span class="level-badge">${level}</span><span class="book-price">−</span><span class="book-qty">0</span></div>`);
  }
  $('#order-book').innerHTML = rows.join('');
}

function calculateAmount() {
  if ($('#order-type').value === 'market') {
    $('#amount').value = '';
    return;
  }
  const quantity = Number($('#quantity').value || 0);
  const price = Number($('#price').value || 0);
  const value = quantity > 0 && price > 0
    ? (quantity * price).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
  $('#amount').value = value || '-';
}

function securityMarket(code) {
  if (/^[569]/.test(code)) return 'SH';
  if (/^[0123]/.test(code)) return 'SZ';
  return '';
}

function requestOrderEntryConfig(code) {
  const config = demoBackendOrderEntryConfig[securityMarket(code)];
  return Promise.resolve(config || { protectionLimit: { visible: false, required: false }, types: [] });
}

function updateMarketTypeOptions(config) {
  const select = $('#market-type');
  const previous = select.value;

  if (!config?.types.length) {
    select.innerHTML = '<option value="">请选择市价类型</option>';
    select.disabled = false;
  } else {
    select.disabled = false;
    select.innerHTML = '<option value="">请选择市价类型</option>' + config.types
      .map(type => `<option value="${type.value}">${type.label}</option>`)
      .join('');
    if (config.types.some(type => type.value === previous)) select.value = previous;
  }
}

async function updateOrderControls() {
  const isMarket = $('#order-type').value === 'market';
  const priceInput = $('#price');
  $('#market-type-field').classList.toggle('hidden', !isMarket || !marketTypeLicenseEnabled);
  $('#amount-field').classList.toggle('hidden', isMarket);
  $('#price-label').textContent = isMarket ? '保护限价' : '价格';
  priceInput.placeholder = isMarket ? '最高买价 / 最低卖价' : '';

  if (!isMarket) {
    activeOrderEntryConfig = null;
    $('#price-field').classList.remove('hidden');
    $('#market-type').value = '';
    priceInput.required = true;
    priceInput.setAttribute('aria-required', 'true');
    calculateAmount();
    return;
  }

  priceInput.value = '';
  activeOrderEntryConfig = await requestOrderEntryConfig($('#security').value);
  const showProtectionLimit = activeOrderEntryConfig.protectionLimit.visible;
  const requiresProtectionLimit = showProtectionLimit && activeOrderEntryConfig.protectionLimit.required;
  $('#price-field').classList.toggle('hidden', !showProtectionLimit);
  if (!showProtectionLimit) priceInput.value = '';
  priceInput.required = requiresProtectionLimit;
  priceInput.setAttribute('aria-required', requiresProtectionLimit ? 'true' : 'false');
  if (marketTypeLicenseEnabled) updateMarketTypeOptions(activeOrderEntryConfig);
  calculateAmount();
}

function setSecurityError(hasError) {
  const security = $('#security');
  security.classList.toggle('field-error', hasError);
  security.setAttribute('aria-invalid', hasError ? 'true' : 'false');
}

function guardMarketTypeSelection(event) {
  if ($('#security').value) {
    setSecurityError(false);
    return;
  }
  event.preventDefault();
  setSecurityError(true);
}

function createOrderSnapshot(side) {
  const security = $('#security').value;
  const securityText = $('#security').selectedOptions[0]?.textContent || '';
  const securityName = securityText.replace(security, '').trim();
  const quantity = Number($('#quantity').value || 0);
  const isMarket = $('#order-type').value === 'market';
  const marketTypeLabel = $('#market-type').selectedOptions[0]?.textContent || '';
  const price = Number($('#price').value || 0);

  return {
    security,
    securityName,
    side,
    isMarket,
    marketTypeLabel,
    protectionLimitVisible: isMarket && Boolean(activeOrderEntryConfig?.protectionLimit.visible),
    price,
    quantity,
    amount: $('#amount').value,
    currency: 'CNY',
    orderMode: $('#order-mode').selectedOptions[0]?.textContent || '',
    remark: $('#remark').value,
  };
}

function addConfirmDetail(label, value, className = '') {
  const details = $('#confirm-details');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = `${label}：`;
  dd.textContent = value || '';
  if (className) dd.className = className;
  details.append(dt, dd);
}

function openOrderConfirmation(snapshot) {
  pendingOrderSnapshot = snapshot;
  const details = $('#confirm-details');
  details.innerHTML = '';

  const risk = $('#market-risk');
  risk.classList.toggle('hidden', !snapshot.isMarket);
  risk.textContent = '市价单实际成交价格和成交数量存在不确定性，请确认订单信息后再提交。';

  addConfirmDetail('合约编号', snapshot.security);
  addConfirmDetail('合约名称', snapshot.securityName);
  addConfirmDetail('委托方向', snapshot.side, snapshot.side === 'Buy' ? 'buy-text' : 'sell-text');
  addConfirmDetail('报价方式', snapshot.isMarket ? 'Market' : 'Limit');
  if (snapshot.isMarket && marketTypeLicenseEnabled) addConfirmDetail('市价类型', snapshot.marketTypeLabel);
  if (!snapshot.isMarket) addConfirmDetail('委托价格', snapshot.price.toFixed(2));
  if (snapshot.protectionLimitVisible) addConfirmDetail('保护限价', snapshot.price.toFixed(2));
  addConfirmDetail('委托数量', snapshot.quantity.toLocaleString('zh-CN'));
  if (!snapshot.isMarket) addConfirmDetail('委托金额', snapshot.amount);
  addConfirmDetail('委托币种', snapshot.currency);
  addConfirmDetail('订单模式', snapshot.orderMode);
  addConfirmDetail('备注', snapshot.remark);

  const backdrop = $('#order-confirm-backdrop');
  backdrop.classList.remove('hidden');
  backdrop.setAttribute('aria-hidden', 'false');
  $('#confirm-order').disabled = false;
  $('#confirm-order').focus();
}

function closeOrderConfirmation() {
  const backdrop = $('#order-confirm-backdrop');
  backdrop.classList.add('hidden');
  backdrop.setAttribute('aria-hidden', 'true');
  pendingOrderSnapshot = null;
}

function submitConfirmedOrder(snapshot) {
  const entrustBody = $('#entrust-rows');
  const tr = document.createElement('tr');
  const id = `WT${Date.now().toString().slice(-8)}`;
  const orderType = snapshot.isMarket && snapshot.marketTypeLabel && marketTypeLicenseEnabled
    ? `Market · ${snapshot.marketTypeLabel}`
    : (snapshot.isMarket ? 'Market' : 'Limit');
  tr.innerHTML = `<td><button class="link-button entrust-cancel">撤单</button></td><td>${id}</td><td>${snapshot.security}</td><td>${snapshot.securityName}</td><td>${snapshot.isMarket ? 'Market' : 'Limit'}</td><td>${snapshot.isMarket && marketTypeLicenseEnabled ? snapshot.marketTypeLabel : '—'}</td><td>${snapshot.side}</td>`;
  entrustBody.prepend(tr);
  toast(`${snapshot.side === 'Buy' ? '买入' : '卖出'} ${orderType} 委托已加入列表（演示数据）`);
}

function placeOrder(side) {
  const security = $('#security').value;
  const quantity = Number($('#quantity').value || 0);
  const isMarket = $('#order-type').value === 'market';
  const marketType = $('#market-type').value;
  const marketTypeLabel = $('#market-type').selectedOptions[0]?.textContent || '';
  if (!security) {
    setSecurityError(true);
    return;
  }
  setSecurityError(false);
  if (quantity <= 0) return toast('请输入有效数量', 'error');
  if (isMarket && marketTypeLicenseEnabled && !marketType) return toast('请选择市价类型', 'error');
  const requiresProtectionPrice = isMarket && activeOrderEntryConfig?.protectionLimit.required;
  if ((!isMarket || requiresProtectionPrice) && Number($('#price').value || 0) <= 0) {
    return toast(isMarket ? '市价单请输入保护限价' : '限价单请输入有效价格', 'error');
  }

  openOrderConfirmation(createOrderSnapshot(side));
}

renderCustomerOrders();
renderOrderBook();

$$('.nav-item').forEach(button => button.addEventListener('click', () => {
  $$('.nav-item').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  if (button.dataset.section !== '交易') toast(`${button.dataset.section}模块为导航演示`);
}));

$$('.collapsible').forEach(title => title.addEventListener('dblclick', () => {
  const target = document.getElementById(title.dataset.target);
  target.classList.toggle('collapsed');
  const caret = $('.caret', title);
  if (caret) caret.textContent = target.classList.contains('collapsed') ? '▸' : '▾';
}));

$('#customer-order-rows').addEventListener('change', event => {
  if (!event.target.matches('.row-check')) return;
  const id = Number(event.target.closest('tr').dataset.id);
  const order = state.orders.find(item => item.id === id);
  order.selected = event.target.checked;
  renderCustomerOrders();
});

$('#customer-order-rows').addEventListener('click', event => {
  const row = event.target.closest('tr');
  if (!row) return;
  const id = Number(row.dataset.id);
  const order = state.orders.find(item => item.id === id);
  if (event.target.matches('.row-cancel')) {
    order.visible = false;
    toast('订单已撤销（演示）');
  } else {
    order.selected = !order.selected;
  }
  renderCustomerOrders();
});

$('#toggle-all').addEventListener('click', () => { state.orders.filter(order => order.visible).forEach(order => order.selected = true); renderCustomerOrders(); });
$('#toggle-none').addEventListener('click', () => { state.orders.forEach(order => order.selected = false); renderCustomerOrders(); });
$('#cancel-selected').addEventListener('click', () => {
  const selected = state.orders.filter(order => order.visible && order.selected);
  if (!selected.length) return toast('请先选择订单');
  selected.forEach(order => order.visible = false);
  renderCustomerOrders();
  toast(`已撤销 ${selected.length} 条订单（演示）`);
});
$('#cancel-all').addEventListener('click', () => { state.orders.forEach(order => order.visible = false); renderCustomerOrders(); toast('当前页订单已全部撤销（演示）'); });
$('#batch-order').addEventListener('click', () => toast('批量下单入口已触发'));

$('#filter-form').addEventListener('submit', event => {
  event.preventDefault();
  const customer = $('#filter-customer').value;
  state.orders.forEach(order => order.visible = !customer || order.customer === customer);
  renderCustomerOrders();
  toast('筛选条件已应用');
});
$('#reset-filter').addEventListener('click', () => {
  $('#filter-form').reset();
  state.orders.forEach(order => { order.visible = true; order.selected = false; });
  renderCustomerOrders();
  toast('筛选条件已重置');
});
$('#export-orders').addEventListener('click', () => toast('已生成导出任务（演示）'));

$$('.pagination button').forEach(button => button.addEventListener('click', () => {
  const action = button.dataset.page;
  if (action === 'first') state.page = 1;
  if (action === 'prev') state.page = Math.max(1, state.page - 1);
  if (action === 'next') state.page = Math.min(250, state.page + 1);
  if (action === 'last') state.page = 250;
  $('#page-current').textContent = state.page;
}));

$$('.stepper button').forEach(button => button.addEventListener('click', () => {
  const input = document.getElementById(button.dataset.step);
  button.dataset.dir === 'up' ? input.stepUp() : input.stepDown();
  calculateAmount();
}));

$('#quantity').addEventListener('input', calculateAmount);
$('#price').addEventListener('input', calculateAmount);
$('#order-type').addEventListener('change', () => {
  $('#price').value = '';
  updateOrderControls();
});
$('#market-type').addEventListener('pointerdown', guardMarketTypeSelection);
$('#market-type').addEventListener('keydown', event => {
  if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) guardMarketTypeSelection(event);
});
$('#market-type').addEventListener('change', () => {
  if ($('#order-type').value === 'market') $('#price').value = '';
});
$('#security').addEventListener('change', () => {
  if ($('#security').value) setSecurityError(false);
  if ($('#order-type').value === 'market') updateOrderControls();
});
$$('.submit').forEach(button => button.addEventListener('click', () => placeOrder(button.dataset.side)));

$('#close-order-confirm').addEventListener('click', closeOrderConfirmation);
$('#cancel-order-confirm').addEventListener('click', closeOrderConfirmation);
$('#confirm-order').addEventListener('click', () => {
  if (!pendingOrderSnapshot) return;
  const snapshot = pendingOrderSnapshot;
  $('#confirm-order').disabled = true;
  submitConfirmedOrder(snapshot);
  closeOrderConfirmation();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#order-confirm-backdrop').classList.contains('hidden')) {
    closeOrderConfirmation();
  }
});

$('#entrust-rows').addEventListener('click', event => {
  if (!event.target.matches('.entrust-cancel')) return;
  event.target.closest('tr').remove();
  toast('委托已撤销（演示）');
});

$('#market-symbol').addEventListener('change', renderOrderBook);
updateOrderControls();
