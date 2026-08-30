require "net/http"
require "uri"

class Api::V1::VenuesController < ApplicationController
  FOURSQUARE_ENDPOINT = URI("https://api.foursquare.com/v2/venues/explore")
  MAX_LOCATION_LENGTH = 120
  MAX_QUERY_LENGTH = 80

  def index
    location = params["location"].to_s.strip
    query = params["query"].to_s.strip

    if location.blank? || location.length > MAX_LOCATION_LENGTH || query.length > MAX_QUERY_LENGTH
      return render json: { error: "invalid venue search" }, status: :unprocessable_entity
    end

    params_for_provider = {
      client_id: ENV.fetch("FOURSQUARE_CLIENT_ID"),
      client_secret: ENV.fetch("FOURSQUARE_CLIENT_SECRET"),
      near: location,
      section: "sights",
      v: "20192503"
    }
    params_for_provider[:query] = query if query.present?

    uri = URI("#{FOURSQUARE_ENDPOINT}?#{URI.encode_www_form(params_for_provider)}")
    response = Net::HTTP.get_response(uri)
    body = JSON.parse(response.body)

    if response.is_a?(Net::HTTPSuccess)
      render json: body
    else
      render json: { error: "venue service is unavailable" }, status: :bad_gateway
    end
  rescue KeyError
    render json: { error: "venue service is not configured" }, status: :service_unavailable
  rescue JSON::ParserError, Net::OpenTimeout, Net::ReadTimeout
    render json: { error: "venue service is unavailable" }, status: :bad_gateway
  end
end
