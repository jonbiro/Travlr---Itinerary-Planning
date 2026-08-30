require "net/http"
require "uri"

class Api::V1::GoogleController < ApplicationController

  def create
    location = params["location"].to_s.strip
    return render json: { error: "location is required" }, status: :unprocessable_entity if location.blank?

    query = URI.encode_www_form(address: location, key: ENV.fetch("GOOGLE_MAPS_API_KEY"))
    response = Net::HTTP.get_response(URI("https://maps.googleapis.com/maps/api/geocode/json?#{query}"))
    @json = JSON.parse(response.body)
    if @json["status"] == "OK"
      @coordinates = @json["results"][0]["geometry"]["location"]
      render json: @coordinates
    else
      render json: { error: "location not found" }, status: :not_found
    end
  rescue KeyError
    render json: { error: "map service is not configured" }, status: :service_unavailable
  rescue JSON::ParserError, Net::OpenTimeout, Net::ReadTimeout
    render json: { error: "map service is unavailable" }, status: :bad_gateway
  end

end
