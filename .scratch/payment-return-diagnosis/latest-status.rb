begin
rows = Orders::Order.order(created_at: :desc).limit(3).map do |o|
 {id: o.id, event: o.event.slug, created_at: o.created_at, status: o.status, total_minor: o.total_minor, payments: o.payments.order(created_at: :desc).map {|p| {id: p.id, status: p.status, failure_code: p.failure_code, accepted_at: p.accepted_at, provider_reference_present: p.provider_reference.present?, merchant_reference: p.provider_merchant_reference, events: p.payment_events.map {|e| {id: e.id, type: e.event_type, status: e.status, received_at: e.received_at}}}}, tickets: Ticketing::Ticket.where(order_item_id: o.order_items.select(:id)).group(:status).count}
end
unmatched = Orders::PaymentEvent.where(payment_id: nil).order(received_at: :desc).limit(3).map {|e| {id: e.id, type: e.event_type, status: e.status, received_at: e.received_at, payload: e.payload.slice("status", "amount", "currency", "merchant_reference", "chapa_reference")}}
puts JSON.generate(orders: rows, unmatched_events: unmatched)
rescue StandardError => e
 puts JSON.generate(error_class: e.class.name)
end