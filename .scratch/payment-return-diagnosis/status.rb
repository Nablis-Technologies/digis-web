event = Events::Event.find_by(slug: "thursday-jazz-sessions")
if event
  rows = Orders::Order.where(event_id: event.id).order(created_at: :desc).limit(5).map do |order|
    {order_id: order.id, status: order.status, created_at: order.created_at, payments: order.payments.order(created_at: :desc).map {|p| {id: p.id, status: p.status, created_at: p.created_at}}, tickets: Ticketing::Ticket.where(order_item_id: order.order_items.select(:id)).group(:status).count}
  end
  puts JSON.generate(event_found: true, orders: rows)
else
  puts JSON.generate(event_found: false)
end