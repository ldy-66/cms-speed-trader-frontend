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

// 交易所支持项应最终由后端/柜台配置返回；这里用于前端原型演示。
const marketTypeConfig = {
  SH: {
    types: [
      { value: 'five-ioc', label: '最优五档即时成交剩余撤销' },
      { value: 'five-limit', label: '最优五档即时成交剩余转限价' },
      { value: 'counterparty', label: '对手方最优价格' },
      { value: 'own-best', label: '本方最优价格' },
    ],
  },
  SZ: {
    types: [
      { value: 'counterparty', label: '对手方最优价格' },
      { value: 'own-best', label: '本方最优价格' },
      { value: 'five-ioc', label: '最优五档即时成交剩余撤销' },
      { value: 'ioc', label: '即时成交剩余撤销（IOC）' },
      { value: 'fok', label: '全额成交或撤销（FOK）' },
    ],
  },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
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
  const quantity = Number($('#quantity').value || 0);
  const price = Number($('#price').value || 0);
  const value = quantity > 0 && price > 0
    ? (quantity * price).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
  $('#amount').value = value ? `${$('#order-type').value === 'market' ? '参考 ' : ''}${value}` : '-';
}

function securityMarket(code) {
  if (/^[569]/.test(code)) return 'SH';
  if (/^[0123]/.test(code)) return 'SZ';
  return '';
}

function setManualError(message = '') {
  const error = $('#manual-error');
  error.textContent = message;
  error.classList.toggle('hidden', !message);
}

function updateMarketTypeOptions() {
  const select = $('#market-type');
  const market = securityMarket($('#security').value);
  const config = marketTypeConfig[market];
  const previous = select.value;

  if (!config) {
    select.innerHTML = '<option value="">请选择市价类型</option>';
    select.disabled = true;
  } else {
    select.disabled = false;
    select.innerHTML = '<option value="">请选择市价类型</option>' + config.types
      .map(type => `<option value="${type.value}">${type.label}</option>`)
      .join('');
    if (config.types.some(type => type.value === previous)) select.value = previous;
  }
}

function updateOrderControls() {
  const isMarket = $('#order-type').value === 'market';
  const priceInput = $('#price');
  $('#market-type-field').classList.toggle('hidden', !isMarket);
  $('#price-label').textContent = isMarket ? '保护限价' : '价格';
  $('#amount-label').textContent = isMarket ? '参考金额' : '委托金额';
  priceInput.placeholder = isMarket ? '最高买价 / 最低卖价' : '';
  if (isMarket) {
    updateMarketTypeOptions();
    setManualError($('#security').value ? '' : '请先选择证券代码');
  } else {
    setManualError();
  }
  calculateAmount();
}

function placeOrder(side) {
  const security = $('#security').value;
  const quantity = Number($('#quantity').value || 0);
  const isMarket = $('#order-type').value === 'market';
  const marketType = $('#market-type').value;
  const marketTypeLabel = $('#market-type').selectedOptions[0]?.textContent || '';
  const orderType = isMarket ? `Market · ${marketTypeLabel}` : 'Limit';
  if (!security) return setManualError('请先选择证券代码');
  setManualError();
  if (quantity <= 0) return toast('请输入有效数量');
  if (isMarket && !marketType) return toast('请选择市价类型');
  if (Number($('#price').value || 0) <= 0) return toast(isMarket ? '市价单请输入保护限价' : '限价单请输入有效价格');

  const entrustBody = $('#entrust-rows');
  const tr = document.createElement('tr');
  const id = `WT${Date.now().toString().slice(-8)}`;
  tr.innerHTML = `<td><button class="link-button entrust-cancel">撤单</button></td><td>${id}</td><td>${security}</td><td>${$('#security').selectedOptions[0].textContent.replace(security, '').trim()}</td><td>${isMarket ? 'Market' : 'Limit'}</td><td>${isMarket ? marketTypeLabel : '—'}</td><td>${side}</td>`;
  entrustBody.prepend(tr);
  toast(`${side === 'Buy' ? '买入' : '卖出'} ${orderType} 委托已加入列表（演示数据）`);
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
$('#order-type').addEventListener('change', updateOrderControls);
$('#security').addEventListener('change', () => {
  if ($('#order-type').value === 'market') {
    updateMarketTypeOptions();
    setManualError($('#security').value ? '' : '请先选择证券代码');
  } else if ($('#security').value) {
    setManualError();
  }
});
$$('.submit').forEach(button => button.addEventListener('click', () => placeOrder(button.dataset.side)));

$('#entrust-rows').addEventListener('click', event => {
  if (!event.target.matches('.entrust-cancel')) return;
  event.target.closest('tr').remove();
  toast('委托已撤销（演示）');
});

$('#market-symbol').addEventListener('change', renderOrderBook);
updateOrderControls();
