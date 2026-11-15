begin
reference = "HCGyXsbvSn5r"
client = Payments::Providers::Registry.fetch("chapa").instance_variable_get(:@client)
response = client.send(:get, "/v2/payments/#{CGI.escape(reference)}/verify")
data = response.body.to_h[:data].to_h
merchant = data[:merchant_reference]
rows = Orders::Payment.where(provider_reference: reference).or(Orders::Payment.where(provider_merchant_reference: merchant)).map {|p| {id: p.id, order_id: p.order_id, status: p.status, amount_minor: p.amount_minor, currency: p.currency, event_slug: p.order&.event&.slug}}
events = Orders::PaymentEvent.where(provider_event_id: reference).or(Orders::PaymentEvent.where("payload ->> 'chapa_reference' = ?", reference)).map do |e|
  {id: e.id, payment_id: e.payment_id, event_type: e.event_type, status: e.status, received_at: e.received_at, processed_at: e.processed_at, attempts: e.attempts_count, payload: e.payload.slice("status", "amount", "currency", "merchant_reference", "chapa_reference", "reference", "tx_ref", "meta", "metadata"), last_error: e.attributes["last_error"]&.slice(0,120)}
end
jazz = Orders::Payment.joins(:order).where(orders_orders: {event_id: Events::Event.find_by!(slug: "thursday-jazz-sessions").id}).map {|p| {id: p.id, order_id: p.order_id, status: p.status, amount_minor: p.amount_minor, currency: p.currency, merchant_matches_receipt: p.provider_merchant_reference == merchant}}
puts JSON.generate(matched_payments: rows, webhook_events: events, jazz_payments: jazz)
rescue StandardError => error
 puts JSON.generate(diagnostic_error_class: error.class.name)
end