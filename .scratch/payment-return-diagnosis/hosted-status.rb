event = Events::Event.find_by!(slug: "thursday-jazz-sessions")
payment = Orders::Payment.joins(:order).where(orders_orders: {event_id: event.id}).order(created_at: :desc).first
url = URI.parse(payment.checkout_url.to_s)
reference = url.path.split("/").reject(&:empty?).last
puts JSON.generate(provider_reference_present: payment.provider_reference.present?, checkout_host: url.host, checkout_reference_matches_merchant: reference == payment.provider_merchant_reference)
if reference.present?
  result = Payments::Providers::Registry.fetch(payment.provider).verify(provider_reference: reference)
  puts JSON.generate(reference_kind: "hosted_url_segment", status: result.status, failure_code: result.failure_code, raw_status: result.raw_status)
end